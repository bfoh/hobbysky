import { createClient } from '@supabase/supabase-js'

export const handler = async function (event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    }

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' }
    }

    try {
        const { email, password, name, role, phone } = JSON.parse(event.body)

        // Validate required fields
        if (!email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email and password are required' })
            }
        }

        // Create Supabase Admin client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase credentials')
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error - missing Supabase credentials' })
            }
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Create user with Admin API (doesn't require email confirmation)
        console.log('[create-employee] Creating user:', email)
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Auto-confirm email
        })

        if (createError) {
            console.error('[create-employee] User creation error:', createError)

            // Handle "user already exists" error - attempt recovery
            if (createError.message.includes('already been registered') ||
                createError.message.includes('already exists')) {
                console.log('[create-employee] User already exists. Searching in auth.users...')

                // Use Admin API to list users and find by email
                const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                    page: 1,
                    perPage: 100
                })

                if (listError) {
                    console.error('[create-employee] Failed to list users:', listError)
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ error: 'User exists but could not be recovered. Please contact support.' })
                    }
                }

                // Find the user with matching email
                const existingUser = listData?.users?.find(u => u.email === email)

                if (existingUser) {
                    console.log('[create-employee] Found existing auth user:', existingUser.id)

                    // Reset password to the one provided
                    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                        existingUser.id,
                        {
                            password: password,
                            email_confirm: true
                        }
                    )

                    if (updateError) {
                        console.error('[create-employee] Failed to reset password:', updateError)
                        return {
                            statusCode: 409,
                            headers,
                            body: JSON.stringify({ error: 'Account exists but password could not be reset. Please contact support.' })
                        }
                    }

                    // Ensure public.users record exists with first_login flag
                    // Note: public.users has no phone column — phone is stored on staff only
                    await supabaseAdmin.from('users').upsert({
                        id: existingUser.id,
                        email: existingUser.email,
                        first_login: 1,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' })

                    // Check if a staff record already exists for this user
                    let recoveredStaff = null
                    const { data: existingStaff } = await supabaseAdmin
                        .from('staff')
                        .select('*')
                        .eq('user_id', existingUser.id)
                        .maybeSingle()

                    if (existingStaff) {
                        recoveredStaff = existingStaff
                    } else {
                        // Create a fresh staff record
                        const { data: newStaff, error: newStaffError } = await supabaseAdmin
                            .from('staff')
                            .insert({
                                id: crypto.randomUUID(),
                                user_id: existingUser.id,
                                name: name,
                                email: existingUser.email,
                                phone: phone || null,
                                role: role || 'staff',
                                created_at: new Date().toISOString(),
                            })
                            .select()
                            .single()

                        if (newStaffError) {
                            console.error('[create-employee] Failed to create staff during recovery:', newStaffError)
                            return {
                                statusCode: 400,
                                headers,
                                body: JSON.stringify({ error: `User recovered but staff record failed: ${newStaffError.message}` })
                            }
                        }
                        recoveredStaff = newStaff
                    }

                    console.log('[create-employee] Successfully recovered existing user account')

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            user: { id: existingUser.id, email: existingUser.email },
                            staffRecord: recoveredStaff ? {
                                id: recoveredStaff.id,
                                userId: recoveredStaff.user_id,
                                name: recoveredStaff.name,
                                email: recoveredStaff.email,
                                phone: recoveredStaff.phone,
                                role: recoveredStaff.role,
                                createdAt: recoveredStaff.created_at,
                            } : null,
                            recovered: true
                        })
                    }
                } else {
                    console.warn('[create-employee] Could not find user in auth.users despite conflict error')
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ error: 'An account with this email already exists but could not be accessed.' })
                    }
                }
            }

            // Other creation errors
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: createError.message })
            }
        }

        if (!userData?.user) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to create user account' })
            }
        }

        console.log('[create-employee] User created successfully:', userData.user.id)

        const userId = userData.user.id
        const userEmail = userData.user.email

        // Create user profile record
        // Note: public.users has no phone column — phone lives on the staff table only
        const { error: profileError } = await supabaseAdmin.from('users').upsert({
            id: userId,
            email: userEmail,
            first_login: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

        if (profileError) {
            console.error('[create-employee] Could not create user profile:', profileError)
            // Fatal: staff.user_id has a FK to public.users — cannot insert staff without this
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Failed to create user profile: ${profileError.message}` })
            }
        }
        console.log('[create-employee] User profile created')

        // Create staff record server-side (service role bypasses RLS)
        const { data: staffRecord, error: staffError } = await supabaseAdmin
            .from('staff')
            .insert({
                id: crypto.randomUUID(),
                user_id: userId,
                name: name,
                email: userEmail,
                phone: phone || null,
                role: role || 'staff',
                created_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (staffError) {
            console.error('[create-employee] Staff record creation error:', staffError)
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    staffError: staffError.message,
                    user: { id: userId, email: userEmail }
                })
            }
        }

        console.log('[create-employee] Staff record created:', staffRecord.id)

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: { id: userId, email: userEmail },
                staffRecord: {
                    id: staffRecord.id,
                    userId: staffRecord.user_id,
                    name: staffRecord.name,
                    email: staffRecord.email,
                    phone: staffRecord.phone,
                    role: staffRecord.role,
                    createdAt: staffRecord.created_at,
                }
            })
        }

    } catch (error) {
        console.error('[create-employee] Error:', error)
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'An unexpected error occurred' })
        }
    }
}
