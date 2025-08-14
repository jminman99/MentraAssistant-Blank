
# Acuity Redirect Configuration

To complete the booking flow, you need to configure Acuity to redirect users back to your app after they complete a booking.

## Steps:

1. **Log into your Acuity Scheduling account**
2. **Go to Business Settings > Integrations**
3. **Find "Redirect Links" or "After Appointment Booking"**
4. **Set the redirect URL to:**
   ```
   https://your-app-domain.replit.dev/booking-confirmation
   ```
   
   Replace `your-app-domain` with your actual Replit app domain.

5. **Enable the redirect for all appointment types**

## Alternative: URL Parameters

You can also add the redirect directly to the booking URL by modifying the `handleBookingRedirect` function in `IndividualBookingDialog.tsx`:

```typescript
bookingUrl.searchParams.set('redirect', 'https://your-app-domain.replit.dev/booking-confirmation');
```

## Webhook Integration

Your existing webhook (`api/acuity-webhook.ts`) will automatically create the booking record in your database when users complete their Acuity appointment, so the session will appear in "My Sessions" as expected.
