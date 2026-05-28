# Testing Setup - Bypass Login Flow

## Introduction

This document guides you through setting up and using the bypass login flow feature for testing and development.

## Environment Configuration

### 1. Create `.env.development` file

Create a `.env.development` file at the project root with the following content:

```bash
# Development Environment Variables
API_URL=http://localhost:3000/api
VAR_NUMBER=123
VAR_BOOL=true
SECRET_KEY=dev-secret-key-12345

# Development Testing Features
BYPASS_LOGIN=true
```

### 2. Set APP_ENV when running

Run the application with development environment:

```bash
# Terminal/Command Prompt
APP_ENV=development npx expo start

# PowerShell (Windows)
$env:APP_ENV="development"; npx expo start

# CMD (Windows)
set APP_ENV=development && npx expo start
```

## Usage

### 1. Automatic Bypass

When `BYPASS_LOGIN=true` in `.env.development`:
- App will automatically log in as **Consumer** on startup
- No need to go through login screen
- Can access main app screens directly

### 2. Manual Control

Use DevUtils in Developer Console:

```javascript
// Login as Consumer
DevUtils.loginAsConsumer()

// Login as Farm
DevUtils.loginAsFarm()

// Toggle between Consumer and Farm
DevUtils.toggleUserMode()

// Logout
DevUtils.logout()

// View current user information
DevUtils.printCurrentUser()

// Reset entire app state
DevUtils.resetAppState()
```

### 3. Switch User Types

**Consumer Mode:**
- Access feed posts
- Create new posts
- Basic settings

**Farm Mode:**
- All Consumer features
- Farm management features
- Farm analytics
- Delivery zones management

## Mock Data

### Consumer User
```typescript
{
  id: 'mock-consumer-123',
  email: 'consumer@test.com',
  firstName: 'Test',
  lastName: 'Consumer',
  role: 'consumer',
  permissions: ['read_posts', 'create_posts', 'update_profile'],
  emailVerified: true,
  phoneVerified: true,
}
```

### Farm User + Farm Data
```typescript
// User
{
  id: 'mock-farm-123',
  email: 'farm@test.com',
  firstName: 'Test Farm',
  lastName: 'Owner',
  role: 'farm',
  permissions: ['read_posts', 'create_posts', 'update_profile', 'manage_farm', 'farm_analytics'],
  farmId: 'mock-farm-data-123',
}

// Farm
{
  id: 'mock-farm-data-123',
  name: 'Test Farm',
  verified: true,
  businessHours: { /* complete schedule */ },
  deliveryZones: [],
}
```

## Development Tips

1. **Console Debugging:**
   - Open Developer Tools → Console
   - Use `DevUtils` commands for quick testing

2. **Route Testing:**
   - Test protected routes with different user roles
   - Verify permissions and access control

3. **Reset State:**
   - Use `DevUtils.resetAppState()` to reset to clean state

4. **Quick Switch:**
   - Use `DevUtils.toggleUserMode()` to quickly switch between Consumer and Farm

## Troubleshooting

### Bypass not working
1. Check `APP_ENV=development`
2. Confirm `BYPASS_LOGIN=true` in `.env.development`
3. Restart expo development server

### DevUtils not available
1. Check console for import errors
2. Only works in development mode
3. Check `global.DevUtils` in console

### Mock data incorrect
1. Check `useDeveloperMode` hook implementation
2. Verify mock data in `src/lib/hooks/use-developer-mode.tsx`

## Related Files

- `env.js` - Environment variables schema
- `src/lib/hooks/use-developer-mode.tsx` - Mock data and development logic
- `src/lib/auth/index.tsx` - Auth store with bypass support
- `src/app/(app)/_layout.tsx` - Auto bypass logic
- `src/lib/dev-utils.tsx` - Development utilities

## Security Notes

⚠️ **IMPORTANT**: This feature only works in development environment. Do not enable in staging or production.

- `BYPASS_LOGIN` only has effect when `APP_ENV=development`
- DevUtils is not exposed in production builds
- Mock tokens and data are for local testing only