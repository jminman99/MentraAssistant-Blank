# Council Booking Debug Checklist

## Backend Fixes Applied
✅ **Single Join Query**: Replaced N+1 Promise.all with `getCouncilParticipantsWithSession`
✅ **Null Guards**: Skip sessions where `session === null`, log warnings
✅ **Field Normalization**: Always return `scheduledDate` in camelCase
✅ **Success Response**: POST route returns `{ success: true, bookingId }`
✅ **Monthly Constraint**: Added `hasExistingCouncilBookingThisMonth` check
✅ **Debug Logging**: Every insert logs userId, scheduledDate, and result

## Frontend Fixes Applied
✅ **Await Invalidation**: `await queryClient.invalidateQueries({ queryKey: ['/api/council-bookings'] })`
✅ **Debug Logging**: Console logs response to verify `{ success: true }`
✅ **Key Matching**: Frontend uses same key as list view: `['/api/council-bookings']`
✅ **Enhanced Filtering**: Detailed logging for session filtering logic

## Debug Steps to Test

### 1. Test POST in Browser/Postman
```bash
POST /api/council-sessions/book
Content-Type: application/json

{
  "selectedMentorIds": [1, 3, 2],
  "sessionGoals": "Test booking",
  "questions": "",
  "preferredDate": "2025-07-15T04:00:00.000Z",
  "preferredTimeSlot": "14:00"
}
```
**Expected**: `{ success: true, bookingId: X }`

### 2. Immediately Test GET
```bash
GET /api/council-bookings
```
**Expected**: JSON array containing the new session with proper `scheduledDate`

### 3. Check Server Logs
Look for:
- `[DEBUG] Council session booking complete - Session ID: X, User ID: Y, Date: Z`
- `[DEBUG] Final API response for user Y: [...]`

### 4. Check Frontend Console
Look for:
- `[DEBUG] Booking response received: { success: true, bookingId: X }`
- `[DEBUG] Council sessions from query: [...]`
- `[DEBUG] Session filter check: { passed: true }`

### 5. Common Issues
- **Empty UI but successful POST**: Check if `scheduledDate` is future date
- **Session not in GET response**: Check for database insert failure
- **Duplicate booking error**: Monthly constraint working correctly
- **Key mismatch**: Ensure both mutation and list use same query key

## SQL Debug Queries
```sql
-- Check if session was actually inserted
SELECT cs.*, cp.mentee_id 
FROM council_sessions cs 
JOIN council_participants cp ON cs.id = cp.council_session_id 
WHERE cp.mentee_id = 9 
ORDER BY cs.scheduled_date DESC LIMIT 5;

-- Check monthly constraint
SELECT 
  EXTRACT(YEAR FROM scheduled_date) as year,
  EXTRACT(MONTH FROM scheduled_date) as month,
  COUNT(*) as bookings
FROM council_sessions cs 
JOIN council_participants cp ON cs.id = cp.council_session_id 
WHERE cp.mentee_id = 9 
GROUP BY year, month;
```

## Timezone Notes
- All dates stored in UTC in database
- Frontend converts to local time for display only
- Booking times use UTC for storage, local for UI