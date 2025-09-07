# Password Reset Feature

## Overview
This feature allows admins to reset user passwords and users to change their own passwords.

## Features

### Admin Password Reset
- **Location**: Admin Dashboard → User Management
- **Access**: Admin users only
- **Functionality**: 
  - View all users in the system
  - Reset passwords for ALL users (including admin users)
  - Generate secure temporary passwords
  - Display temporary password in modal for sharing
  - Delete users from the system

### User Password Change
- **Location**: User Dashboard → Change Password
- **Access**: All non-admin users
- **Functionality**:
  - Change password with current password verification
  - Password validation (minimum 6 characters)
  - Secure password hashing

## How to Use

### For Admins (User Management)
1. Go to Admin Dashboard
2. Click "User Management" 
3. **To Reset Password:**
   - Find the user you want to reset
   - Click "Reset Password"
   - Confirm the action
   - Copy the temporary password from the modal
   - Share the temporary password with the user securely (text, WhatsApp, etc.)
   - User must change password on next login
4. **To Delete User:**
   - Find the user you want to delete
   - Click "Delete"
   - Confirm the action (cannot be undone)
   - User and all their data will be permanently removed

### For Users (Password Change)
1. **If password was reset by admin**: You'll be automatically redirected to the change password page
2. **If changing voluntarily**: Go to User Dashboard → Click "Change Password"
3. Enter current password (or temporary password if reset by admin)
4. Enter new password (minimum 6 characters)
5. Confirm new password
6. Click "Change Password"
7. You'll be redirected to your appropriate dashboard

## Security Features
- Passwords are hashed using bcrypt with salt rounds of 12
- Temporary passwords are 12 characters long with secure character set
- Current password verification required for changes
- **Force password change**: Users must change temporary passwords on next login
- Admin users can reset any password (including their own)
- Users cannot delete their own accounts
- Non-admin users cannot access admin features
- Cascade delete removes all user data when deleting accounts
- Automatic redirect to password change page when required

## API Endpoints

### GET /api/admin/users
- Fetches all users (admin only)
- Returns user ID, name, email, role, and join date

### POST /api/admin/reset-password
- Resets a user's password (admin only)
- Works for both admin and non-admin users
- Generates secure temporary password
- Returns temporary password for sharing

### DELETE /api/admin/users
- Deletes a user account (admin only)
- Prevents self-deletion
- Cascade deletes all user data
- Returns success confirmation

### POST /api/auth/change-password
- Changes user's password (authenticated users)
- Requires current password verification
- Updates password in database

## Database Changes
- Added `mustChangePassword` boolean field to User model
- Field defaults to `false` for existing users
- Set to `true` when admin resets a password
- Set to `false` when user successfully changes password
