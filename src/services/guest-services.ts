import { supabase } from '../lib/supabase'

export async function submitGuestRequest(
    token: string,
    reqType: string,
    reqDetails: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('submit_guest_request', {
            token_input: token,
            req_type: reqType,
            req_details: reqDetails
        })

        if (error) {
            console.error('[submitGuestRequest] RPC Error:', error)
            return { success: false, error: 'Failed to communicate with the server.' }
        }

        if (data && data.success) {
            return { success: true }
        }

        return { success: false, error: 'Server returned an invalid response.' }
    } catch (err) {
        console.error('[submitGuestRequest] Unexpected Error:', err)
        return { success: false, error: 'An unexpected error occurred.' }
    }
}
