# PHASE 1 — Email & Phone Verification

## CONTEXT
Read CONTEXT.md first. That is your memory.
The backend is NestJS 11 + MongoDB + JWT. The frontend is React Native + Expo.
The codebase already has: AuthModule, UsersModule, global ValidationPipe,
JWT auth, bcrypt, and a working register/login flow.

## YOUR TASK THIS SESSION
Implement email and phone OTP verification — backend and frontend wiring only.
Do NOT touch any other feature.

---

## STEP 1 — INVESTIGATE FIRST

Read these files before writing anything:

```bash
# Frontend shells that already exist
cat f2t-frontend/src/api/auth/use-verify-email.tsx
cat f2t-frontend/src/api/auth/use-verify-phone.tsx
cat f2t-frontend/src/app/verification.tsx   # or find the correct path
find f2t-frontend/src -name "*verif*" -o -name "*otp*" | sort

# Backend auth module
cat f2t-backend/src/modules/auth/auth.controller.ts
cat f2t-backend/src/modules/auth/auth.service.ts
cat f2t-backend/src/modules/users/schemas/user.schema.ts
```

Extract from the frontend hooks:
- Exact endpoint paths expected
- Request body shape (what fields does the hook send?)
- Response shape (what fields does the hook read?)

Build this table before writing any code:

| Hook | Method | Path | Request body | Response fields read |
|------|--------|------|-------------|----------------------|
| use-verify-email | | | | |
| use-verify-phone | | | | |
| use-send-otp (if exists) | | | | |

---

## STEP 2 — BACKEND IMPLEMENTATION

### 2a. VerificationToken Schema
Create `src/modules/auth/schemas/verification-token.schema.ts`:
```typescript
// Required fields:
// userId: ObjectId ref User
// token: string (6-digit OTP)
// type: enum ['email', 'phone']
// expiresAt: Date (10 minutes from creation)
// used: boolean (default false)
// _seeded: boolean (optional, for seed script)
```

### 2b. New endpoints (match EXACTLY what frontend hooks call)
Add to `auth.controller.ts`:
```
POST /auth/send-otp     → send OTP to email or phone
POST /auth/verify-otp   → validate OTP, mark user verified
```

Add to User schema:
```typescript
@Prop({ default: false }) emailVerified: boolean;
@Prop({ default: false }) phoneVerified: boolean;
@Prop() phoneNumber?: string;
```

### 2c. OTP Generation
```typescript
// Generate 6-digit OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();
// Store hashed in DB (bcrypt), send plain to user
const hashedOtp = await bcrypt.hash(otp, 10);
// Expire after 10 minutes
const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
```

### 2d. Email sending — use Nodemailer for now
```bash
npm install nodemailer @types/nodemailer
```
Create `src/modules/auth/email.service.ts`:
- Read SMTP config from ConfigService (.env)
- Method: `sendOtpEmail(to: string, otp: string)`
- Use a real HTML template (not just plain text)

Add to `.env.development`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="F2T App <noreply@f2t.vn>"
```

### 2e. Phone (SMS) — stub for now
Create `src/modules/auth/sms.service.ts` with a clear TODO:
```typescript
async sendOtpSms(phoneNumber: string, otp: string): Promise<void> {
  // TODO: integrate Twilio or ESMS.vn (Vietnamese SMS provider)
  // For development, log the OTP to console only
  console.log(`[DEV] SMS OTP for ${phoneNumber}: ${otp}`);
}
```

### 2f. DTOs
```typescript
// SendOtpDto
type: 'email' | 'phone'

// VerifyOtpDto  
type: 'email' | 'phone'
otp: string (6 digits, IsNumberString, Length(6,6))
```

### 2g. Rate limit OTP endpoints
```typescript
@Throttle({ short: { ttl: 60000, limit: 3 } }) // max 3 OTP requests/minute
@Post('send-otp')
```

---

## STEP 3 — FRONTEND WIRING

After backend is confirmed working, wire the frontend:

```bash
# Find the verification screen
find f2t-frontend/src -name "*verif*" | sort
```

- The `use-verify-email.tsx` and `use-verify-phone.tsx` hooks should call
  the new backend endpoints you just built
- If the paths don't match what the frontend already expects → adjust backend
  path to match (never change the frontend hooks)
- If the verification screen exists but is not wired → wire it to the hooks

---

## STEP 4 — VERIFICATION CHECKLIST

```bash
# Build must pass
cd f2t-backend && npm run build && npm run lint && npm test

# Manual test — request OTP
curl -s -X POST http://localhost:3000/api/auth/send-otp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "email"}' | jq .
# Expected: { success: true, data: { message: "OTP sent" } }

# Check OTP in dev console log or email
# Then verify it
curl -s -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "otp": "123456"}' | jq .
# Expected: { success: true, data: { emailVerified: true } }

# Try wrong OTP
curl -s -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "otp": "000000"}' | jq .
# Expected: 400 Bad Request — "Invalid or expired OTP"

# Try expired OTP (mock by setting expiresAt in past in DB)
# Expected: 400 Bad Request — "Invalid or expired OTP"

# Try using same OTP twice
# Expected: 400 Bad Request — "Invalid or expired OTP"
```

---

## STEP 5 — UPDATE CONTEXT.md

At the end of this session, update CONTEXT.md:
- Mark Phase 1 (Verification) as ✅ Complete
- Add new endpoints to the endpoint table
- Add any new env vars to the known config list
- Add any new tech debt discovered
- Output the full updated CONTEXT.md

---

## RULES
- Backend path must match exactly what the frontend hooks call
- OTP must expire after 10 minutes
- OTP must be invalidated after one successful use
- Rate limit OTP send to 3 per minute per user
- SMS can be a console.log stub — email must actually send in development
- `npm run build && npm run lint && npm test` must pass before session ends
- Do not touch any other module

## START
Say: **"Starting Phase 1 — Verification. Reading frontend hooks and existing auth module."**