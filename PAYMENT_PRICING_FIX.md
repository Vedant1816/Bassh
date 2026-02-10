# Payment Summary Pricing Fix

## Issue
The payment summary in the booking screen was showing **₹0** for all ticket prices.

## Root Cause
1. **API Issue**: The `/api/events/[id]` endpoint was trying to order by a non-existent `price` column in the `event_ticket_pricing` table
2. **Frontend Issue**: The `book.tsx` file was using `targetPricing.price` which doesn't exist in the database schema - the table only has `stag_price` and `couple_price` columns

## Database Schema
The `event_ticket_pricing` table has the following columns:
- `id` (uuid)
- `event_id` (uuid) 
- `label` (text)
- **`stag_price`** (bigint) - Price for single entry
- **`couple_price`** (bigint) - Price for couple entry
- `created_at` (timestamp)

**Note**: There is NO `price` column in the table.

## Fixes Applied

### 1. Backend API Fix (`/web/app/api/events/[id]/route.ts`)

**Before:**
```typescript
const { data: pricing, error: pricingError } = await supabaseAdmin
  .from("event_ticket_pricing")
  .select("*")
  .eq("event_id", id)
  .order("price", { ascending: true }); // ❌ 'price' column doesn't exist
```

**After:**
```typescript
const { data: pricing, error: pricingError } = await supabaseAdmin
  .from("event_ticket_pricing")
  .select("id, event_id, label, stag_price, couple_price, created_at")
  .eq("event_id", id)
  .order("stag_price", { ascending: true, nullsFirst: false }); // ✅ Uses stag_price
```

**Changes:**
- ✅ Explicitly select the correct columns
- ✅ Order by `stag_price` instead of non-existent `price`
- ✅ Add `nullsFirst: false` to ensure entries with prices appear first

### 2. Frontend Fix (`/myApp/app/event/[id]/book.tsx`)

**Before:**
```typescript
setSelections(new Map([[targetPricing.id, {
  pricingId: targetPricing.id,
  label: targetPricing.label,
  price: targetPricing.price, // ❌ undefined - this field doesn't exist
  stagPrice: targetPricing.stag_price,
  couplePrice: targetPricing.couple_price,
  quantity: newQty,
}]]));
```

**After:**
```typescript
setSelections(new Map([[targetPricing.id, {
  pricingId: targetPricing.id,
  label: targetPricing.label,
  price: targetPricing.stag_price || 0, // ✅ Use stag_price as default/base price
  stagPrice: targetPricing.stag_price || 0,
  couplePrice: targetPricing.couple_price || 0,
  quantity: newQty,
}]]));
```

**Changes:**
- ✅ Set `price` field to `stag_price` (since stag is the most common entry type)
- ✅ Add fallback to `0` if prices are null/undefined
- ✅ Properly map `stag_price` and `couple_price` from database

## How Pricing Works Now

### Price Calculation Logic

The `getTotalPrice()` function calculates the total based on entry type:

1. **Stag Entry** (default):
   ```typescript
   price = quantity × stagPrice
   ```

2. **Couple Entry**:
   ```typescript
   price = quantity × couplePrice
   ```

3. **Couple Entry with Participants** (advanced):
   ```typescript
   males = participants.filter(male).length
   females = participants.filter(female).length
   couples = min(males, females)
   stags = participants.length - (couples × 2)
   
   price = (couples × couplePrice) + (stags × stagPrice)
   ```

### Example

If the database has:
- `stag_price`: 1000
- `couple_price`: 1500

**Scenario 1**: Select 2 stag tickets
- Total: 2 × ₹1000 = **₹2000**

**Scenario 2**: Select 2 couple tickets
- Total: 2 × ₹1500 = **₹3000**

**Scenario 3**: 3 participants (2 males, 1 female)
- Couples formed: 1
- Stags remaining: 1
- Total: (1 × ₹1500) + (1 × ₹1000) = **₹2500**

## Testing

To verify the fix:

1. **Check Database**: Ensure events have pricing entries in `event_ticket_pricing` table:
   ```sql
   SELECT id, event_id, label, stag_price, couple_price 
   FROM event_ticket_pricing 
   WHERE event_id = 'your-event-id';
   ```

2. **Test Booking Flow**:
   - Navigate to an event
   - Click "Book Now"
   - Increase ticket quantity
   - Verify prices show correctly in payment summary

3. **Test Both Entry Types**:
   - Switch between "Stag" and "Couple" entry types
   - Verify pricing updates correctly

## Notes

- The `price` field in the `TicketSelection` interface is kept for backward compatibility but now sources from `stag_price`
- If both `stag_price` and `couple_price` are null/0, the total will show ₹0
- The booking can still proceed with ₹0 (useful for free events)
