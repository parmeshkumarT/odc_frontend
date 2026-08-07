# Troubleshooting: "Your profile is not linked to a vendor"

## Problem
After uploading a certificate or navigating to vendor pages, you see the error:
**"Your profile is not linked to a vendor. Please contact the administrator."**

## Root Cause
Your user profile in the database doesn't have a `vendor_id` set. This is required for all vendor admin functionality.

## Solution

### Check Your Profile
1. Open your browser console (F12)
2. Go to the Vendor Dashboard
3. Look at the debug information shown - it will display your profile data
4. Check if `vendor_id` is `null` or `undefined`

### Fix via Database (Supabase)

1. **Go to Supabase Dashboard** → Table Editor → `profiles` table

2. **Find your profile record**:
   - Filter by your `user_id` (from Supabase Auth → Users)
   - Or filter by your email

3. **Update the record**:
   - Set `vendor_id` to the UUID of your vendor (from `vendors` table)
   - Ensure `role` is set to `"vendor_admin"`

### SQL Fix

```sql
-- First, find your vendor_id
SELECT id, name FROM vendors;

-- Then update your profile
UPDATE profiles
SET vendor_id = '<your-vendor-id-here>'
WHERE user_id = '<your-user-id-from-auth>';

-- Verify the update
SELECT id, user_id, role, vendor_id, email 
FROM profiles 
WHERE user_id = '<your-user-id-from-auth>';
```

### Fix via Admin Interface

1. **Login as Super Admin**
2. Go to `/admin/vendors`
3. Find your vendor
4. Click "Create Vendor Admin" or "Manage Users"
5. Create/update your user profile with the vendor_id

## Verification

After fixing, you should:
1. Logout and login again
2. Navigate to `/vendor/dashboard`
3. You should see the dashboard with statistics (not the error)

## Common Issues

### Issue: Profile doesn't exist
**Solution**: Create a profile record in the `profiles` table with:
- `user_id`: Your Supabase Auth user ID
- `role`: `"vendor_admin"`
- `vendor_id`: Your vendor's UUID
- `email`: Your email address

### Issue: vendor_id is wrong
**Solution**: Update the `vendor_id` in your profile to match the correct vendor

### Issue: Profile loads but vendor_id is null
**Solution**: The profile exists but vendor_id wasn't set. Update it using the SQL above.

## Debug Information

The Vendor Dashboard now shows debug information when vendor_id is missing. This includes:
- Your profile data (id, role, vendor_id, user_id)
- Your user data (id, email)

Use this information to verify what's in your profile.
