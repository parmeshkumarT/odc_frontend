# How to Access the ODC Dashboard

## Quick Answer

**URL**: `http://localhost:5173/odc/dashboard`

However, you need to be logged in as a user with the `odc_user` role and have an `odc_id` assigned in your profile.

---

## Step-by-Step Guide

### Method 1: Automatic Redirect (Recommended)

1. **Start the development server** (if not running):
   ```bash
   npm run dev
   ```

2. **Navigate to the root URL**:
   ```
   http://localhost:5173/
   ```

3. **Login Process**:
   - If you're **not logged in**: You'll see the Login page
   - Enter your email and password
   - Click "Login"

4. **Automatic Redirect**:
   - After login, the system checks your role from the `profiles` table
   - If your role is `odc_user`, you'll be **automatically redirected** to `/odc/dashboard`
   - This happens via the `RoleRedirect` component

### Method 2: Direct URL Access

If you're already logged in as an `odc_user`:

1. **Direct URL**:
   ```
   http://localhost:5173/odc/dashboard
   ```

2. **Note**: If you try to access this URL without being logged in or without the correct role, you'll be redirected to login or see an error.

---

## Prerequisites: Setting Up an ODC User Account

To access the ODC dashboard, you need:

### 1. **User Account in Supabase Auth**
   - User must exist in Supabase Auth
   - User must have a password set (or use magic link for first login)

### 2. **Profile Record in Database**
   You need a record in the `profiles` table with:
   ```sql
   {
     user_id: "<user-id-from-auth>",
     role: "odc_user",           -- Must be "odc_user"
     odc_id: "<odc-location-id>", -- Must be linked to an ODC
     vendor_id: null              -- Usually null for ODC users
   }
   ```

### 3. **ODC Location Must Exist**
   The ODC referenced by `odc_id` must:
   - Exist in the `odc_locations` table
   - Have status `"approved"` (or `null` for pending)

---

## How to Create an ODC User (For Testing)

### Option A: Via Database (Direct SQL)

1. **First, create/get a user in Supabase Auth** (via Supabase dashboard or signup)

2. **Get the user ID** from Supabase Auth

3. **Create an ODC location** (if it doesn't exist):
   ```sql
   INSERT INTO odc_locations (vendor_id, name, location, address, status)
   VALUES (
     '<vendor-id>',           -- Get from vendors table
     'Test ODC',
     'Bangalore, India',
     '123 Test Street',
     'approved'              -- Must be 'approved' for ODC users to access
   )
   RETURNING id;
   ```

4. **Create the profile**:
   ```sql
   INSERT INTO profiles (user_id, role, odc_id, vendor_id)
   VALUES (
     '<user-id-from-auth>',
     'odc_user',
     '<odc-id-from-step-3>',
     NULL
   );
   ```

### Option B: Via Vendor Admin Interface

1. **Login as Vendor Admin** (`vendor_admin` role)
2. Navigate to `/vendor/users`
3. Click "Create User" or "Add User"
4. Fill in:
   - Email (must match Supabase Auth user)
   - Role: Select `odc_user`
   - ODC: Select the ODC location
5. Save

---

## Troubleshooting

### Issue: "Role Not Assigned"
**Error**: "Your account does not have a role assigned"

**Solution**:
- Check that your user has a record in the `profiles` table
- Ensure the `role` field is set to `"odc_user"` (not `"odc"` or anything else)

### Issue: "Your profile is not linked to an ODC"
**Error**: "Your profile is not linked to an ODC. Please contact your vendor administrator."

**Solution**:
- Check that your profile has an `odc_id` set
- Ensure the `odc_id` references a valid ODC in `odc_locations` table
- Verify the ODC status is `"approved"` (or `null`)

### Issue: Redirected to Wrong Dashboard
**Problem**: You're being redirected to `/vendor/dashboard` or `/admin/dashboard` instead

**Solution**:
- Check your `profiles.role` field in the database
- It should be exactly `"odc_user"` (case-sensitive)
- Common mistake: `"odc"` instead of `"odc_user"`

### Issue: Cannot Access `/odc/dashboard` Directly
**Problem**: Getting redirected to login or seeing "Forbidden"

**Solution**:
- Make sure you're logged in
- Check that your role is `odc_user`
- Verify your profile has `odc_id` set
- Check browser console for errors

---

## Testing the ODC Dashboard

### Quick Test Setup:

1. **Create test data via SQL**:
   ```sql
   -- 1. Create a vendor (if needed)
   INSERT INTO vendors (name, email, status) 
   VALUES ('Test Vendor', 'vendor@test.com', 'approved')
   RETURNING id;

   -- 2. Create an ODC
   INSERT INTO odc_locations (vendor_id, name, location, status)
   VALUES (
     '<vendor-id>',
     'Test ODC',
     'Test Location',
     'approved'
   )
   RETURNING id;

   -- 3. Create user in Supabase Auth (via dashboard or API)
   -- Get the user ID

   -- 4. Create profile
   INSERT INTO profiles (user_id, role, odc_id)
   VALUES (
     '<auth-user-id>',
     'odc_user',
     '<odc-id>'
   );
   ```

2. **Login with the user's email/password**

3. **You should be redirected to `/odc/dashboard`**

---

## ODC Dashboard Features

Once you access the ODC dashboard, you can:

1. **View Statistics**:
   - Total Certificates
   - Pending Validation
   - Passed Validation
   - Failed Validation
   - Expiring Certificates (within 30 days)

2. **Quick Actions**:
   - Upload Certificate → `/odc/upload`
   - View All Certificates → `/odc/certificates`

3. **ODC Information**:
   - ODC Name
   - Location
   - Address
   - Status (approved/pending)

---

## Navigation Structure

```
/ (root)
  └─> If logged in → RoleRedirect
      └─> If role = "odc_user" → /odc/dashboard

/odc/dashboard          ← ODC Dashboard (main page)
/odc/upload            ← Upload Certificate
/odc/certificates      ← View All Certificates
/odc/certificates/:id  ← Certificate Details
```

---

## Code Reference

The routing logic is in:
- **`src/routes/RoleRedirect.jsx`** (line 56-57): Redirects `odc_user` to `/odc/dashboard`
- **`src/routes/AppRoutes.jsx`** (line 196-206): Defines the `/odc/dashboard` route
- **`src/pages/odc/Dashboard.jsx`**: The actual ODC dashboard component

The dashboard checks:
- User is authenticated
- User has `odc_user` role
- User's profile has `odc_id` set
- ODC exists and is approved

---

## Summary

**To reach the ODC dashboard:**

1. ✅ Have a user account in Supabase Auth
2. ✅ Have a profile with `role = "odc_user"`
3. ✅ Have `odc_id` set in your profile
4. ✅ ODC must exist and be approved
5. ✅ Login at `http://localhost:5173/`
6. ✅ You'll be automatically redirected to `/odc/dashboard`

**Direct URL** (if already logged in): `http://localhost:5173/odc/dashboard`
