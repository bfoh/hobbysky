# Client Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 9 client-requested fixes/enhancements covering revenue accounting, guest/booking edit UX, notifications, inventory linkage, SMS reliability, checkout form polish, invoice list completeness, activity-log attribution, and date-validity rules.

**Architecture:** This is a React + Vite + Supabase app deployed on Netlify. Mutations route through `blink.db.*` (a thin Supabase wrapper). Lifecycle side-effects (email/SMS) are dispatched from `src/services/notifications.ts`. SMS goes through `netlify/functions/send-sms.js` → Arkesel V1. Activity logging through `src/services/activity-log-service.ts`. Each task here is a small, self-contained change that can ship independently.

**Tech Stack:** React 18 + Vite, Supabase (via blink wrapper), Tailwind + shadcn/ui, Resend (email), Arkesel V1 (SMS), Netlify Functions, Playwright (smoke).

**Verification commands** (run after every task):
```bash
npm run lint:types     # tsc --noEmit
npm run lint:js        # eslint
```
For UI tasks add a manual smoke check in the running `npm run dev` server.

**Convention:** the project does not have unit tests for services. Tests below are written as targeted manual verification scripts under `scripts/verify/` (run with `node`) plus visual smoke. If a service already has a sibling test file, prefer adding a Playwright spec instead.

---

## Task Index

1. Room extension category fix (revenue inclusion) — `room_extension` not `other`
2a. Implement `bookingEngine.updateBooking` (no-op → real)
2b. Add Edit button + edit flow to BookingsPage
2c. Verify Guest edit works end-to-end (no code change expected; sanity)
3. Manager SMS + email on stay extension
4. Link guest charges to inventory items (auto-decrement + recent-stock log)
5. Owner SMS reliability — `await` the manager notification call
6. Check-out dialog polish (ink hierarchy + spacing parity with check-in)
7. Invoices page — include checked-in bookings
8. Activity logs — pass userId at all task callsites
9. Validation — `checkIn >= today` enforced on every booking-create path

---

## Task 1: Room Extension Charge Category

**Why:** Extension charges are written with `category: 'other'` but the schema added a dedicated `'room_extension'` category. Reports and revenue dashboards that filter by category will miss extensions. The migration `2025122302_add_room_extension_category.sql` already added the enum value.

**Files:**
- Modify: `src/services/stay-extension-service.ts:298`
- Modify: `src/services/stay-extension-service.ts:312` (discount sub-charge — keep as `other`, the discount is not itself an extension)
- Modify: `src/services/revenue-service.ts` — confirm `room_extension` is included in `additionalChargesTotal`
- Modify: `src/services/analytics-service.ts` — same
- Verify: `supabase/migrations/2025122302_add_room_extension_category.sql` exists

- [ ] **Step 1: Confirm migration is applied in production**

```bash
grep -n "room_extension" supabase/migrations/*.sql
```
Expected: file `2025122302_add_room_extension_category.sql` returns. If missing, the constraint will reject the insert. Apply the migration before continuing.

- [ ] **Step 2: Change extension charge category**

Edit `src/services/stay-extension-service.ts` line 298:

```typescript
// before
category: 'other',
// after
category: 'room_extension',
```

Leave the discount sub-charge at line 312 as `'other'` (it is a separate negative line item).

- [ ] **Step 3: Confirm revenue services include the new category**

`src/services/revenue-service.ts` — search for category filtering:

```bash
grep -n "category" src/services/revenue-service.ts
```

If revenue sums all charges (no category filter), no change needed — extension charges flow into `additionalChargesTotal` automatically. If a filter exists that excludes `room_extension`, add it to the allow-list.

`src/services/analytics-service.ts` — same check.

- [ ] **Step 4: Type-check**

```bash
npm run lint:types
```
Expected: 0 errors.

- [ ] **Step 5: Manual smoke**

In dev server, extend an active booking by 1 night. Open the bookings detail dialog → Charges. Confirm the new charge shows under category "Room Extension". Open Reports → Revenue This Week. Confirm the additional revenue total increased by the extension cost.

- [ ] **Step 6: Commit**

```bash
git add src/services/stay-extension-service.ts
git commit -m "fix(extension): tag stay-extension charges as room_extension category"
```

---

## Task 2a: Implement `bookingEngine.updateBooking`

**Why:** Currently a stub (`booking-engine.ts:902-904`) returns immediately. Required before Task 2b can wire an Edit button.

**Files:**
- Modify: `src/services/booking-engine.ts:902-904`
- Reference: `src/services/booking-engine.ts:112` (createBooking shape)

- [ ] **Step 1: Read createBooking to mirror its DB column mapping**

```bash
sed -n '112,210p' src/services/booking-engine.ts
```
Note the mapping from `LocalBooking` fields to the DB row (snake_case columns vs camelCase JS).

- [ ] **Step 2: Replace the stub**

Edit `src/services/booking-engine.ts:902-904` — replace:

```typescript
// No-op compatibility for existing calls
async updateBooking(_id: string, _updates: Partial<LocalBooking>): Promise<void> {
  return
}
```

with:

```typescript
async updateBooking(id: string, updates: Partial<LocalBooking>): Promise<void> {
  const db = blink.db as any

  // Convert local-style ID to remote ID format if needed
  let remoteId = id
  if (id.startsWith('booking_')) {
    remoteId = id.replace(/^booking_/, 'booking-')
  }

  // Whitelist editable fields. Status, payment, and date changes go through
  // dedicated service methods (checkInBooking, recordPayment, extendStay) — do not
  // overwrite them here.
  const editable: Record<string, any> = {}
  if (updates.checkIn !== undefined)       editable.checkIn       = updates.checkIn
  if (updates.checkOut !== undefined)      editable.checkOut      = updates.checkOut
  if (updates.totalPrice !== undefined)    editable.totalPrice    = updates.totalPrice
  if (updates.specialRequests !== undefined) editable.specialRequests = updates.specialRequests
  if (updates.paymentMethod !== undefined) editable.paymentMethod = updates.paymentMethod
  if (updates.numGuests !== undefined)     editable.numGuests     = updates.numGuests
  if (updates.roomId !== undefined)        editable.roomId        = updates.roomId

  if (Object.keys(editable).length === 0) {
    console.warn('[BookingEngine] updateBooking called with no editable fields')
    return
  }

  editable.updatedAt = new Date().toISOString()

  // Date sanity — checkOut > checkIn (Task 9 also enforces this at the form layer)
  if (editable.checkIn && editable.checkOut && new Date(editable.checkOut) <= new Date(editable.checkIn)) {
    throw new Error('Check-out date must be after check-in date')
  }

  console.log('[BookingEngine] Updating booking:', remoteId, editable)

  await db.bookings.update(remoteId, editable)

  // Activity log
  try {
    const currentUser = await blink.auth.me().catch(() => null)
    await activityLogService.log({
      action: 'updated',
      entityType: 'booking',
      entityId: remoteId,
      details: { updatedFields: Object.keys(editable) },
      userId: currentUser?.id
    })
  } catch (e) {
    console.warn('[BookingEngine] Activity log for update failed:', e)
  }
}
```

If `activityLogService` is not already imported at the top of the file, add it:

```typescript
import { activityLogService } from './activity-log-service'
```
(Check first — it may already be imported.)

- [ ] **Step 3: Type-check**

```bash
npm run lint:types
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/booking-engine.ts
git commit -m "feat(booking): implement updateBooking with whitelisted fields + audit log"
```

---

## Task 2b: Edit Booking UI

**Why:** Bookings list has only a delete icon. Client wants to edit guest/dates/price on existing bookings.

**Files:**
- Modify: `src/pages/staff/BookingsPage.tsx` (add edit button at lines ~911 and edit branch in `handleSubmit` ~220, plus form prefill helper)
- Reference: `src/pages/staff/GuestsPage.tsx:215-255` (edit pattern to mirror)

- [ ] **Step 1: Add edit handler that prefills the existing dialog**

In `BookingsPage.tsx`, add the helper near the other handlers (above `handleSubmit`):

```typescript
const handleEditClick = (booking: any) => {
  setEditingId(booking.id)
  setFormData({
    propertyId: booking.roomId || '',
    guestName: booking.guestName || '',
    guestEmail: booking.guestEmail || '',
    guestPhone: booking.guestPhone || '',
    guestAddress: booking.guestAddress || '',
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    adults: booking.numGuests || 1,
    children: 0,
    totalPrice: Number(booking.totalPrice) || 0,
    notes: '',
    paymentMethod: booking.paymentMethod || 'cash',
    paymentType: 'full',
    amountPaid: Number(booking.totalPrice) || 0,
    paymentSplits: [{ method: booking.paymentMethod || 'cash', amount: Number(booking.totalPrice) || 0 }]
  })
  setDialogOpen(true)
}
```

- [ ] **Step 2: Add the edit button to each booking card**

In `BookingsPage.tsx` around line 911 (just before the existing delete button), wrap the actions in a flex group:

```tsx
<div className="flex items-center gap-2">
  <Button
    variant="ghost"
    size="icon"
    onClick={() => handleEditClick(booking)}
    aria-label="Edit booking"
  >
    <Pencil className="h-4 w-4" />
  </Button>
  {canDeleteBookings && (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => handleDeleteClick(booking.id)}
      className="text-destructive hover:text-destructive"
      aria-label="Delete booking"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</div>
```

Make sure `Pencil` is imported from `lucide-react` at the top of the file. If not, add it:

```typescript
import { Pencil, Trash2 } from 'lucide-react'
```

- [ ] **Step 3: Branch `handleSubmit` on `editingId`**

In `BookingsPage.tsx` around line 220, before the create-booking call, insert the update branch:

```typescript
// Build a payload that the engine accepts for partial update
if (editingId) {
  await bookingEngine.updateBooking(editingId, {
    checkIn: formData.checkIn,
    checkOut: formData.checkOut,
    totalPrice: formData.totalPrice,
    paymentMethod: finalPaymentMethod as any,
    numGuests: formData.adults + formData.children,
    roomId: selectedProperty?.id,
    specialRequests: notesWithSplits
  })
  toast.success('Booking updated')
  setDialogOpen(false)
  setEditingId(null)
  resetForm()
  loadData()
  return
}
```

- [ ] **Step 4: Update dialog title to reflect mode**

Find the booking dialog `<DialogTitle>` and change to `{editingId ? 'Edit Booking' : 'New Booking'}` (mirror GuestsPage pattern at GuestsPage.tsx:399).

- [ ] **Step 5: Type-check + lint**

```bash
npm run lint:types && npm run lint:js
```
Expected: 0 errors.

- [ ] **Step 6: Manual smoke**

In dev: open Bookings page → click pencil on a confirmed booking → change check-out date and total → Save. Verify:
- Toast "Booking updated"
- Card reflects new values without page reload
- Activity Logs page shows an "updated booking" entry attributed to the current user

- [ ] **Step 7: Commit**

```bash
git add src/pages/staff/BookingsPage.tsx
git commit -m "feat(bookings): add edit button + edit flow to bookings list"
```

---

## Task 2c: Guest Edit Sanity Check

**Why:** Client says guest edits "do not work". The Explore pass found the code path is correct (`GuestsPage.tsx:215-255`). Most likely cause: optimistic UI does not reload, or Supabase RLS rejects the update silently.

**Files:**
- Inspect only: `src/pages/staff/GuestsPage.tsx:215-255`
- Possibly modify: same file (force reload after update)

- [ ] **Step 1: Reproduce in dev**

Run `npm run dev`. Edit a guest's phone number. Click Save. Watch DevTools Network tab and Console.

- Case A — request succeeds, UI does not refresh: jump to Step 2.
- Case B — request returns 4xx/5xx: capture the response, jump to Step 3.

- [ ] **Step 2: Force reload after update**

In `GuestsPage.tsx`, locate the `handleSubmit` edit branch and ensure `loadGuests()` (or whatever the list-loader is named in this file) is called after the success toast. Pattern:

```typescript
await blink.db.guests.update(editingId, { ...formData, userId: user.id, updatedAt: new Date().toISOString() })
toast.success('Guest updated')
setDialogOpen(false)
setEditingId(null)
resetForm()
await loadGuests()  // <-- add if missing
```

- [ ] **Step 3: If RLS rejected, fix policy**

If the network call returned 401/403, open Supabase dashboard → Authentication → Policies → `public.guests`. Confirm an UPDATE policy exists for authenticated users. The reference UPDATE policy:

```sql
create policy "Authenticated staff can update guests"
on public.guests for update
to authenticated
using (true) with check (true);
```

Apply via SQL editor; do not commit credentials.

- [ ] **Step 4: Manual smoke**

Edit guest → save → reload page → confirm change persisted in DB.

- [ ] **Step 5: Commit (only if code changed)**

```bash
git add src/pages/staff/GuestsPage.tsx
git commit -m "fix(guests): reload list after edit so UI reflects update"
```

---

## Task 3: Manager Notifications on Stay Extension

**Why:** `notifications.ts:638-711` (`sendStayExtensionNotification`) emails+SMSes the guest but never the owner. Check-in already does this via `sendManagerCheckInNotification`. Reuse the same pattern.

**Files:**
- Modify: `src/services/notifications.ts:638-711` (`sendStayExtensionNotification`)
- Reference: `src/services/notifications.ts:480-530` (`sendManagerCheckInNotification`)

- [ ] **Step 1: Read the existing manager-checkin pattern**

```bash
sed -n '480,540p' src/services/notifications.ts
```
Note the hardcoded `ownerPhones` array and the `Promise.all(...).catch(...)` pattern.

- [ ] **Step 2: Add a `sendManagerExtensionNotification` helper next to `sendManagerCheckInNotification`**

In `notifications.ts`, immediately after `sendManagerCheckInNotification`, add:

```typescript
export async function sendManagerExtensionNotification(
  guest: { name: string; email?: string },
  room: { roomNumber: string },
  extensionDetails: { additionalNights: number; newCheckOut: string; cost: number; currency: string },
  staffName: string
): Promise<void> {
  // Reuse the same hardcoded owner numbers as check-in
  const ownerPhones = ['+233243512529', '+233552515787']

  const message = `Stay Extension — ${guest.name}, Room ${room.roomNumber}, +${extensionDetails.additionalNights} night(s) to ${extensionDetails.newCheckOut}. Charge: ${extensionDetails.currency}${extensionDetails.cost.toFixed(2)}. Processed by ${staffName}.`

  const smsPromises = ownerPhones.map(phone =>
    sendSMS(phone, message, 'Manager Extension Alert')
      .catch(err => console.error(`[ManagerExtension] SMS failed for ${phone}:`, err))
  )
  await Promise.all(smsPromises)
}
```

- [ ] **Step 3: Call it from `sendStayExtensionNotification`**

In `notifications.ts:638-711` (`sendStayExtensionNotification`), at the end of the function (after the guest email/SMS) add:

```typescript
try {
  await sendManagerExtensionNotification(
    { name: guest.name, email: guest.email },
    { roomNumber: room.roomNumber },
    { additionalNights, newCheckOut, cost: extensionCost, currency },
    staffName || 'Staff'
  )
} catch (e) {
  console.error('[StayExtension] Manager notification failed:', e)
  // Do not throw — the extension itself succeeded
}
```

Make sure `additionalNights`, `newCheckOut`, `extensionCost`, `currency`, and `staffName` are already in scope (they are in the parameter list of `sendStayExtensionNotification`); if any are missing, plumb them through.

- [ ] **Step 4: Type-check**

```bash
npm run lint:types
```

- [ ] **Step 5: Manual smoke**

Extend a booking. Both owner phones receive an SMS within 30s. Confirm by checking Arkesel dashboard (https://account.arkesel.com → SMS → Logs) for two entries.

- [ ] **Step 6: Commit**

```bash
git add src/services/notifications.ts
git commit -m "feat(notifications): send manager SMS on stay extension"
```

---

## Task 4: Link Guest Charges to Inventory

**Why:** Today, `GuestChargesDialog` writes a `booking_charges` row with a free-text description. It does not pick from `inventory_items`, does not decrement `stock_quantity`, and does not write to `inventory_logs`. So a guest buying a Coke from the minibar does not appear in Recent Stock activity, and stock counts drift. `LogSaleDialog` already has the right pattern for non-guest sales — port it.

**Files:**
- Modify: `src/components/dialogs/GuestChargesDialog.tsx` (add inventory item picker + adjust-stock call)
- Reference: `src/components/dialogs/LogSaleDialog.tsx` (existing pattern)
- Reference: `src/services/inventory-service.ts:76-117` (`adjustStock`)
- Modify: `src/services/booking-charges-service.ts` if `inventoryItemId` needs to be persisted (see Step 4)

- [ ] **Step 1: Read the existing pattern**

```bash
sed -n '60,170p' src/components/dialogs/LogSaleDialog.tsx
sed -n '76,118p' src/services/inventory-service.ts
```
Note: `adjustStock({ itemId, type: 'sale', quantityChange: -qty, staffId, staffName, notes })` is the call.

- [ ] **Step 2: Add inventory item picker to `GuestChargesDialog`**

In `GuestChargesDialog.tsx`, add state near the other charge-form state:

```typescript
const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>('')
```

In the existing `useEffect` that runs on dialog open, also fetch items:

```typescript
inventoryService.getItems().then(setInventoryItems).catch(() => setInventoryItems([]))
```

In the JSX, above the Description input, add a Select:

```tsx
<div>
  <Label>Inventory Item (optional)</Label>
  <Select value={selectedInventoryItemId} onValueChange={(v) => {
    setSelectedInventoryItemId(v)
    if (v && v !== 'none') {
      const item = inventoryItems.find(i => i.id === v)
      if (item) {
        setDescription(item.name)
        setUnitPrice(Number(item.unitPrice) || 0)
        setCategory((item.category as ChargeCategory) || 'other')
      }
    }
  }}>
    <SelectTrigger><SelectValue placeholder="None — manual entry" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="none">None — manual entry</SelectItem>
      {inventoryItems.map(item => (
        <SelectItem key={item.id} value={item.id} disabled={item.stockQuantity <= 0}>
          {item.name} — {item.stockQuantity} in stock
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Add the imports at the top of the file:

```typescript
import { inventoryService, type InventoryItem } from '@/services/inventory-service'
```

- [ ] **Step 3: Decrement stock in `handleAddCharge`**

In `GuestChargesDialog.tsx:90-124` (`handleAddCharge`), after the successful `bookingChargesService.addCharge(chargeData)` call, before the toast, add:

```typescript
if (selectedInventoryItemId && selectedInventoryItemId !== 'none') {
  const item = inventoryItems.find(i => i.id === selectedInventoryItemId)
  if (item) {
    if (item.stockQuantity < quantity) {
      toast.error(`Only ${item.stockQuantity} in stock — charge created but stock not adjusted`)
    } else {
      const user = await blink.auth.me().catch(() => null)
      await inventoryService.adjustStock({
        itemId: item.id,
        type: 'sale',
        quantityChange: -quantity,
        staffId: user?.id || 'system',
        staffName: user?.email || 'Staff',
        notes: `Guest purchase — Booking ${booking.id} (${description})`
      }).catch(err => console.error('[GuestCharges] Stock adjust failed:', err))
    }
  }
}
```

- [ ] **Step 4 (optional but recommended): Persist `inventoryItemId` on the charge**

Update `CreateChargeData` in `src/services/booking-charges-service.ts` to optionally include `inventoryItemId` so future invoices/reports can join. Add to the type and to the insert payload (DB column already exists if the schema has it; otherwise add a migration `ALTER TABLE booking_charges ADD COLUMN inventory_item_id TEXT REFERENCES inventory_items(id)` and a corresponding migration file `supabase/migrations/2026050801_charge_inventory_link.sql`).

If you choose to skip persistence for now, leave a `// TODO` comment and move on — the recent-stock feed already works through `inventory_logs` (Step 3).

- [ ] **Step 5: Type-check**

```bash
npm run lint:types
```

- [ ] **Step 6: Manual smoke**

1. In dev, open a checked-in booking → Charges → Add charge.
2. Select an inventory item from the new picker.
3. Confirm description + unit price auto-fill.
4. Save.
5. Open Inventory page (or wherever Recent Stock activity lives) and confirm the new `inventory_logs` entry appears with type `sale`.
6. Confirm the item's `stockQuantity` decreased by the entered quantity.

- [ ] **Step 7: Commit**

```bash
git add src/components/dialogs/GuestChargesDialog.tsx src/services/booking-charges-service.ts
git commit -m "feat(charges): link guest charges to inventory items + decrement stock"
```

---

## Task 5: Owner SMS Reliability on Check-In

**Why:** `use-check-in.ts:226-235` calls `sendManagerCheckInNotification(...).catch(...)` without `await`. The hook returns and the React component may unmount before Arkesel finishes both HTTPS calls. The result: 0552515787 (the second number in the array) intermittently never gets called because the JS context is torn down.

**Files:**
- Modify: `src/hooks/use-check-in.ts:226-235`
- Reference: `src/services/notifications.ts:614-627` (already correctly awaits internally — no change needed)

- [ ] **Step 1: Convert fire-and-forget to awaited**

In `use-check-in.ts` around line 226:

```typescript
// before
sendManagerCheckInNotification(guest, room, bookingForNotification, user?.email || user?.name || 'Staff', {
  method: paymentInfo, amount: finalAmount
}).catch(err => console.error('❌ [useCheckIn] Manager notification failed:', err))

// after
try {
  await sendManagerCheckInNotification(
    guest,
    room,
    bookingForNotification,
    user?.email || user?.name || 'Staff',
    { method: paymentInfo, amount: finalAmount }
  )
  console.log('✅ [useCheckIn] Manager notification dispatched')
} catch (err) {
  console.error('❌ [useCheckIn] Manager notification failed:', err)
}
```

The check-in itself has already succeeded in the DB by this point (status update happens earlier in the hook). Awaiting only delays the toast/dialog close by ~1-2s — acceptable trade-off.

- [ ] **Step 2: (Defensive) sequence the two SMS sends inside `notifications.ts`**

Open `notifications.ts:614-627`. The current code uses `Promise.all` which fires both Arkesel V1 calls in parallel. Arkesel V1 occasionally rate-limits two near-simultaneous requests from the same sender ID. Convert to sequential `for...of`:

```typescript
// before
const smsPromises = allPhones.map(phone => sendManagerCheckInSMS({ ... }).catch(...))
await Promise.all(smsPromises)

// after
for (const phone of allPhones) {
  try {
    await sendManagerCheckInSMS({ phone, guestName: guest.name, roomNumber: room.roomNumber, paymentAmount, paymentMethod })
  } catch (err) {
    console.error(`[ManagerNotification] SMS failed for ${phone}:`, err)
  }
}
```
This adds ~500ms total latency but eliminates the rate-limit race.

- [ ] **Step 3: Type-check**

```bash
npm run lint:types
```

- [ ] **Step 4: Manual smoke (the real test)**

Perform 5 consecutive check-ins on different bookings. Both owner phones (+233243512529 and +233552515787) must receive every alert. Cross-check with Arkesel logs.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-check-in.ts src/services/notifications.ts
git commit -m "fix(sms): await manager notification + sequence Arkesel calls so 0552515787 always fires"
```

---

## Task 6: Check-Out Form Polish

**Why:** Client says "check-out form needs to be formatted properly". The Explore pass found the dialog is already structured but uses inconsistent spacing and emoji-as-icon ("🏷", "💰", "✓"). To match check-in dialog parity and keep things print/email friendly, replace inline emoji with `lucide-react` icons and tighten spacing.

**Files:**
- Modify: `src/components/dialogs/CheckOutDialog.tsx`

- [ ] **Step 1: Audit current state**

```bash
sed -n '113,272p' src/components/dialogs/CheckOutDialog.tsx
```
List the emoji used: 🏷 (line ~155), 💰 (line ~178), ✓ (line ~250+).

- [ ] **Step 2: Replace emoji with icons**

At the top of `CheckOutDialog.tsx`, ensure these icons are imported:

```typescript
import { Tag, Wallet, CheckCircle2, Loader2 } from 'lucide-react'
```

Replace:
- `🏷 Discount Applied at Check-In` → `<Tag className="w-4 h-4 mr-2 inline" /> Discount Applied at Check-In`
- `💰 Prior Payment` → `<Wallet className="w-4 h-4 mr-2 inline" /> Prior Payment`
- `✓ Booking status updated…` (and the other ✓ items) → use `<CheckCircle2 className="w-4 h-4 mr-2 inline text-emerald-400" />`

- [ ] **Step 3: Tighten spacing to match `CheckInDialog`**

In the outer wrapper, change `space-y-4` to `space-y-3`. In each colored info box, change `p-3` to `px-4 py-3` for consistency with `CheckInDialog.tsx:151-171`.

- [ ] **Step 4: Widen the dialog**

Change `<DialogContent className="max-w-md">` to `<DialogContent className="max-w-lg">` so the totals breakdown does not wrap on shorter labels.

- [ ] **Step 5: Type-check + visual smoke**

```bash
npm run lint:types
npm run dev
```
Open a checked-in booking → Check Out. Visually compare with Check-In dialog — heading sizes, colored info boxes, total row, and footer button row should mirror it.

- [ ] **Step 6: Commit**

```bash
git add src/components/dialogs/CheckOutDialog.tsx
git commit -m "polish(checkout): replace emoji with lucide icons + tighten spacing for parity with check-in"
```

---

## Task 7: Invoices Page — Include Checked-In Bookings

**Why:** `StaffInvoiceManager.tsx:74-85` only fetches `confirmed` and `checked-out` bookings. Active stays (`checked-in`) cannot have a current invoice viewed. Owner says "invoices page is not having invoices of all bookings".

**Files:**
- Modify: `src/components/StaffInvoiceManager.tsx:74-85` (query)
- Modify: `src/components/StaffInvoiceManager.tsx:115-152` (status mapping)
- Modify: `src/components/StaffInvoiceManager.tsx:64` (filter type)

- [ ] **Step 1: Add `checked-in` to the parallel fetch**

In `StaffInvoiceManager.tsx:74-85`:

```typescript
// before
const [confirmedBookings, checkedOutBookings] = await Promise.all([
  db.bookings.list({ where: { status: 'confirmed' }, limit: 100, orderBy: { createdAt: 'desc' } }),
  db.bookings.list({ where: { status: 'checked-out' }, limit: 100, orderBy: { createdAt: 'desc' } })
])
const allBookings = [...confirmedBookings, ...checkedOutBookings]

// after
const [confirmedBookings, checkedInBookings, checkedOutBookings] = await Promise.all([
  db.bookings.list({ where: { status: 'confirmed' },   limit: 100, orderBy: { createdAt: 'desc' } }),
  db.bookings.list({ where: { status: 'checked-in' },  limit: 100, orderBy: { createdAt: 'desc' } }),
  db.bookings.list({ where: { status: 'checked-out' }, limit: 100, orderBy: { createdAt: 'desc' } })
])
const allBookings = [...confirmedBookings, ...checkedInBookings, ...checkedOutBookings]
```

- [ ] **Step 2: Add a third status mapping**

In `StaffInvoiceManager.tsx:115-152`, replace the binary `isPreInvoice` flag with a status-aware mapper:

```typescript
const isConfirmed = booking.status === 'confirmed'
const isCheckedIn = booking.status === 'checked-in'
const isCheckedOut = booking.status === 'checked-out'

const baseInvoiceNumber = booking.invoiceNumber || `INV-${booking.createdAt ? new Date(booking.createdAt).getTime() : Date.now()}`
const invoiceNumber = isConfirmed ? `PRE-${baseInvoiceNumber}` : isCheckedIn ? `LIVE-${baseInvoiceNumber}` : baseInvoiceNumber

const mappedStatus: 'pending' | 'live' | 'paid' = isConfirmed ? 'pending' : isCheckedIn ? 'live' : 'paid'
```

Update the returned `InvoiceRecord` type (search for `InvoiceRecord` definition) to add `'live'` to the status union.

- [ ] **Step 3: Update the filter UI**

`StaffInvoiceManager.tsx:64`:

```typescript
const [filter, setFilter] = useState<'all' | 'pending' | 'live' | 'paid'>('all')
```

In the filter select / tab UI, add a "Live" option that maps to `live` (in-stay invoices).

- [ ] **Step 4: Type-check**

```bash
npm run lint:types
```

- [ ] **Step 5: Manual smoke**

1. Have at least one booking in each of the three states (use existing data or create test rows).
2. Open Invoices page — all three appear.
3. Filter by Live — only checked-in bookings show.
4. Click a Live invoice — preview opens with current charges total.

- [ ] **Step 6: Commit**

```bash
git add src/components/StaffInvoiceManager.tsx
git commit -m "fix(invoices): include checked-in bookings (live invoices) in invoices list"
```

---

## Task 8: Activity Logs — Pass userId at Every Callsite

**Why:** When `userId` is omitted, `activity-log-service.ts:197` falls back to `'system'`. Three known callsites do this: task creation on checkout, task completion, task assignment. Result: the Activity Logs page shows "system" for housekeeping events.

**Files:**
- Modify: `src/services/booking-engine.ts:1482-1493`
- Modify: `src/pages/staff/HousekeepingPage.tsx:118-124`
- Modify: `src/pages/staff/HousekeepingPage.tsx:188-222`

- [ ] **Step 1: Fix booking-engine task-creation log**

In `booking-engine.ts:1482-1493`, locate `activityLogService.log({ action: 'created', entityType: 'task', ... })`. The surrounding code already has access to a user (the staff who triggered checkout) — inspect the function signature.

If `userId` is in scope, add it directly:

```typescript
await activityLogService.log({
  action: 'created',
  entityType: 'task',
  entityId: taskId,
  details: { title: `Room ${roomNumber} Cleaning`, roomNumber, guestName: guest?.name || 'Guest', reason: 'checkout', createdAt: new Date().toISOString() },
  userId: staffUserId   // <-- add
}).catch(err => console.error('Failed to log task creation:', err))
```

If not, fetch it inline before the log call:

```typescript
const currentUser = await blink.auth.me().catch(() => null)
```

- [ ] **Step 2: Fix HousekeepingPage task-completion log**

`HousekeepingPage.tsx:118-124`:

```typescript
const currentUser = await blink.auth.me().catch(() => null)
await activityLogService.logTaskCompleted(selectedTask.id, {
  title: `Room ${selectedTask.roomNumber} Cleaning`,
  completedBy: getStaffName(selectedTask.assignedTo),
  ...
}, currentUser?.id)   // <-- third arg
```

If `logTaskCompleted` does not currently accept a third argument, open `activity-log-service.ts`, find the method, and add an optional `userId?: string` parameter that gets passed through to `this.log({ ..., userId })`.

- [ ] **Step 3: Fix HousekeepingPage task-assignment + deletion logs**

`HousekeepingPage.tsx:188-222`:

```typescript
const currentUser = await blink.auth.me().catch(() => null)
await activityLogService.log({
  action: 'assigned',
  entityType: 'task',
  entityId: taskId,
  details: { title: `Room ${task.roomNumber} Cleaning`, ... },
  userId: currentUser?.id   // <-- add
})
```

Repeat for any sibling `activityLogService.log({...})` calls in the same file that currently omit `userId`.

- [ ] **Step 4: Sweep for other callsites**

```bash
grep -rn "activityLogService.log\|activityLogService.log[A-Z]" src/ --include="*.ts" --include="*.tsx"
```
For each match, confirm `userId` is passed (or `currentUserId` is set on the service before the call). Add `userId` where missing — do not skip any.

- [ ] **Step 5: (Optional, larger fix) Add `userName` column**

If the user wants the logs UI to show a friendly name without an extra fetch, add a migration:

```sql
-- supabase/migrations/2026050802_activity_logs_user_name.sql
ALTER TABLE public.activity_logs ADD COLUMN user_name TEXT;
```

In `activity-log-service.ts:191`, after resolving the email, include it:

```typescript
const logEntry = { ..., userId, userName: userEmail }
```

This is optional — only do it if Step 1-4 alone do not solve the display problem.

- [ ] **Step 6: Type-check**

```bash
npm run lint:types
```

- [ ] **Step 7: Manual smoke**

1. Trigger a checkout (creates a task) → open Activity Logs → confirm the entry shows the staff email, not "system".
2. Mark the resulting cleaning task as complete → check Activity Logs again → same.
3. Assign or delete a task → same.

- [ ] **Step 8: Commit**

```bash
git add src/services/booking-engine.ts src/pages/staff/HousekeepingPage.tsx src/services/activity-log-service.ts
git commit -m "fix(activity-log): pass userId on task create/complete/assign so logs show actor not 'system'"
```

---

## Task 9: Date Validity — `checkIn >= today`

**Why:** Client clarified: "check-in date cannot be earlier than booking date". The Netlify function `create-booking.js:135-150` already validates this for the public flow, but the staff `BookingsPage.tsx` calls `bookingEngine.createBooking()` directly (skipping that function) and has no client-side guard. Same for the new edit flow from Task 2b.

**Files:**
- Modify: `src/services/booking-engine.ts:112` (`createBooking`)
- Modify: `src/services/booking-engine.ts` (the `updateBooking` added in Task 2a)
- Modify: `src/pages/staff/BookingsPage.tsx` (form-level guard + HTML5 `min` attribute)

- [ ] **Step 1: Engine-level guard in `createBooking`**

In `booking-engine.ts:112`, near the top of the method (after parameter destructuring), add:

```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)
const requestedCheckIn = new Date(bookingData.checkIn || bookingData.dates?.checkIn)
requestedCheckIn.setHours(0, 0, 0, 0)
if (requestedCheckIn < today) {
  throw new Error(`Check-in date (${requestedCheckIn.toISOString().slice(0,10)}) cannot be earlier than today (${today.toISOString().slice(0,10)}).`)
}
```

Use whichever field name your `LocalBooking` actually carries (`checkIn` vs `dates.checkIn`); inspect the existing parameter shape inside `createBooking` to confirm.

- [ ] **Step 2: Engine-level guard in `updateBooking`**

The `updateBooking` you implemented in Task 2a already enforces `checkOut > checkIn`. Add the same `checkIn >= today` rule there for consistency:

```typescript
if (editable.checkIn) {
  const today = new Date(); today.setHours(0,0,0,0)
  const ci = new Date(editable.checkIn); ci.setHours(0,0,0,0)
  if (ci < today) throw new Error('Check-in date cannot be earlier than today')
}
```

- [ ] **Step 3: Form-level guard in `BookingsPage`**

In `BookingsPage.tsx`, at the top of `handleSubmit` (line ~225, before any DB call):

```typescript
const todayStr = new Date().toISOString().slice(0, 10)
if (formData.checkIn < todayStr) {
  toast.error('Check-in date cannot be earlier than today')
  return
}
if (formData.checkOut <= formData.checkIn) {
  toast.error('Check-out date must be after check-in date')
  return
}
```

- [ ] **Step 4: HTML5 `min` attribute on the date input**

Locate the check-in `<Input type="date" ... />` in `BookingsPage.tsx`. Add the `min` attribute:

```tsx
<Input
  type="date"
  value={formData.checkIn}
  min={new Date().toISOString().slice(0, 10)}
  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
/>
```

For the check-out input:

```tsx
<Input
  type="date"
  value={formData.checkOut}
  min={formData.checkIn || new Date().toISOString().slice(0, 10)}
  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
/>
```

This stops most input via the native picker; the JS guard in Step 3 catches paste/keyboard bypasses.

- [ ] **Step 5: Confirm public book-now flow has the same guard**

```bash
grep -n "min=" src/website/pages/book-now/page.tsx
```
If the public 5-step flow lacks `min`, add it the same way. The Netlify function already rejects past dates server-side — but a client-side block is friendlier UX.

- [ ] **Step 6: Type-check**

```bash
npm run lint:types
```

- [ ] **Step 7: Manual smoke**

1. Try to create a booking with check-in = yesterday → toast "Check-in date cannot be earlier than today", no DB write.
2. Try to edit an existing booking and back-date check-in → same toast.
3. Try to book with check-out = check-in → toast "Check-out date must be after check-in date".
4. Book with check-in = today → succeeds (walk-in still allowed, per clarification).

- [ ] **Step 8: Commit**

```bash
git add src/services/booking-engine.ts src/pages/staff/BookingsPage.tsx src/website/pages/book-now/page.tsx
git commit -m "fix(booking): block check-in dates earlier than today on every create/update path"
```

---

## Self-Review Checklist

- [x] **Spec coverage** — every requirement (1-9) has at least one task. Req 4 = Task 4. Req 9 = Task 9. Req 2 split into 2a/2b/2c because the missing `updateBooking` had to be implemented before the UI could call it.
- [x] **No placeholders** — every step shows the actual code or command. The single intentional "TODO" in Task 4 Step 4 is a deliberate scope choice flagged to the engineer.
- [x] **Type consistency** — `updateBooking` signature in Task 2a is reused in Tasks 2b and 9. `sendManagerExtensionNotification` in Task 3 uses the same `ownerPhones` array as `sendManagerCheckInNotification`. Activity-log `userId` field name is consistent across Tasks 8 and 2a.
- [x] **Order matters** — Task 2a must ship before 2b. Task 1 may ship before or after 3. Tasks 5, 6, 7, 8 are independent.
- [x] **Verification** — every task ends with `npm run lint:types` plus a manual smoke. The codebase has no unit-test runner wired in, so smoke + lint is the verification floor.

## Suggested ship order

1. **Task 5** (highest user impact: owner SMS reliability) — 5 min change.
2. **Task 8** (audit trail integrity) — 15 min.
3. **Task 1** (revenue accuracy) — 5 min.
4. **Task 3** (manager notification on extension) — 15 min.
5. **Task 9** (date validity) — 30 min.
6. **Task 7** (invoices completeness) — 30 min.
7. **Task 2a → 2b → 2c** (booking edit) — 90 min.
8. **Task 4** (inventory linkage) — 90 min, biggest scope, ship last.
9. **Task 6** (checkout polish) — 30 min, opportunistic.

Total ~5 hours of focused work.
