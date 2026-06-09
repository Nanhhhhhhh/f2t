# Design: Auth Password Reset, Reviews & Ratings, Admin Enhancements, Post Tagging Fix

**Date:** 2026-06-09  
**Status:** Approved  
**Scope:** F2T — f2t-backend + f2t-frontend

---

## 1. Password Reset & Change Password

### 1.1 Forgot Password (OTP via Email)

**Flow:**
1. User taps "Quên mật khẩu?" on login screen → `forgot-password.tsx`
2. Enters email → `POST /api/auth/forgot-password`
   - Backend generates 6-digit OTP, stores in `otp_tokens` collection with 10-minute TTL
   - Sends OTP via Nodemailer to the email address
   - Returns `{ success: true }` regardless (no email enumeration)
3. User enters OTP → `POST /api/auth/verify-otp`
   - Validates OTP against stored token
   - Returns `{ resetToken }` — short-lived JWT (15 min), payload `{ sub: userId, purpose: 'password-reset' }`
4. User enters new password → `POST /api/auth/reset-password`
   - Validates `resetToken` and purpose claim
   - Updates bcrypt hash, invalidates OTP token

**Backend:**
- New endpoints in `auth.controller.ts` (3 endpoints above)
- New `OtpToken` schema: `{ email, otp, expiresAt }` — TTL index on `expiresAt`
- New `src/common/services/email.service.ts` using Nodemailer
  - Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - Graceful fallback: if SMTP vars not set → `console.log` OTP (never throws)
- Throttle: `POST /api/auth/forgot-password` — 3 req/min/IP (existing ThrottlerGuard)
- New DTOs: `ForgotPasswordDto`, `VerifyOtpDto`, `ResetPasswordDto`

**Frontend:**
- `src/app/forgot-password.tsx` — email input, link from login screen
- `src/app/verify-otp.tsx` — 6-digit OTP input, resend button (60s cooldown)
- `src/app/reset-password.tsx` — new password + confirm password fields
- Navigation: `login.tsx` → `forgot-password` → `verify-otp` → `reset-password` → back to `login`
- New API hooks: `useForgotPassword`, `useVerifyOtp`, `useResetPassword` in `src/api/auth/`

### 1.2 Change Password (Authenticated)

**Backend:**
- `PATCH /api/users/profile/password` — JWT-guarded
- Body: `{ currentPassword: string, newPassword: string }`
- Validates `currentPassword` via `bcrypt.compare` before updating
- New DTO: `ChangePasswordDto`

**Frontend:**
- Section "Đổi mật khẩu" in profile settings (`src/app/(app)/profile/edit.tsx` or new `change-password.tsx`)
- 3 fields: current password, new password, confirm new password
- New API hook: `useChangePassword` in `src/api/users/`

---

## 2. Reviews & Ratings

### 2.1 Architecture

New `reviews` module (`src/modules/reviews/`). Separate MongoDB collection — not embedded in Product — to avoid document bloat and enable pagination.

**Review schema:**
```
{
  productId: ObjectId (ref: Product),
  orderId:   ObjectId (ref: Order),
  customerId: ObjectId (ref: User),
  rating:    number (1–5, integer),
  comment:   string (max 500 chars),
  photos:    string[] (max 3 URLs, from uploads module),
  createdAt, updatedAt
}
```

**Indexes:**
- `{ productId, customerId }` unique — one review per buyer per product
- `{ productId }` for listing
- `{ customerId }` for "my reviews"

**Product schema additions:**
- `averageRating: number` (default 0)
- `reviewCount: number` (default 0)

Updated atomically after each review create/delete using `$avg` aggregate.

### 2.2 Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/reviews` | JWT, consumer | Guard verifies caller has an order with status `delivered` containing `productId` |
| `GET` | `/api/reviews?productId=&page=&limit=` | Public | Paginated, sorted by `createdAt desc` |
| `GET` | `/api/reviews/my` | JWT, consumer | Reviews written by caller |
| `DELETE` | `/api/reviews/:id` | JWT | Owner or admin only |

### 2.3 Frontend

- `products/[id].tsx` — add "Đánh giá" section: average stars display, `reviewCount`, paginated review list
- "Viết đánh giá" button — visible only if `myOrders` contains a `delivered` order with this `productId` (client-side pre-check; server is authoritative)
- `src/app/products/add-review.tsx` — star selector (1–5), text input (max 500), photo picker (max 3, uses existing `useUploadMedia`)
- New API hooks: `useGetReviews`, `useAddReview`, `useDeleteReview`, `useMyReviews` in `src/api/reviews/`

---

## 3. Admin Panel Enhancements

### 3.1 New Backend Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/posts` | Paginated. Params: `page, limit, search` |
| `DELETE` | `/api/admin/posts/:id` | Hard delete |

Reviews admin uses `DELETE /api/reviews/:id` — AdminGuard bypasses ownership check (admin can delete any review).

### 3.2 New Frontend Screens

- `src/app/admin/posts.tsx` — list posts, search, delete button per row
- `src/app/admin/products.tsx` — list all products (uses existing `GET /api/admin/products`), filter by farm/search, delete product
- `src/app/admin/reviews.tsx` — list all reviews (uses `GET /api/reviews` with no productId filter — add `adminAll=true` param or use a dedicated admin endpoint), delete review

### 3.3 Existing Screen Enhancements

**Users (`admin/users.tsx`):**
- Add search input (already supported by `GET /api/admin/users?search=`)
- Add role filter chips (consumer / farm / admin)
- Expandable row or modal: avatar, join date, order count

**Farms (`admin/farms.tsx`):**
- Add verificationStatus filter (pending / verified / rejected)
- Expandable row: address, product count, link to admin Products filtered by farmId

**Orders (`admin/orders.tsx`):**
- Add paymentStatus filter
- Add date-range picker (from/to)
- Expandable row: items list, shipping address, tracking status

**Dashboard (`admin/index.tsx`):**
- Add navigation buttons for Products, Posts, Reviews (alongside existing Users/Farms/Orders)

---

## 4. Post Tagging Fix

### 4.1 Root Cause

`add-post.tsx` has `tags[]` in the form schema but no UI to populate it. The `tags` array is always `[]` on submit.

### 4.2 New Backend Endpoint

`GET /api/users/search?q=` — JWT-guarded, returns `{ id, name, avatarUrl }[]` (no email/phone). Max 10 results. Added to `users.controller.ts`.

`GET /api/farms?search=` already exists and returns the needed fields.

### 4.3 Frontend Fix (add-post.tsx)

- Add "Tag người / farm" button below the body input
- Button opens a bottom sheet with two tabs: **Người dùng** | **Farm**
- Search input → debounced calls to `GET /api/users/search?q=` or `GET /api/farms?search=`
- Select a result → appends `{ id, type, name }` to `tags[]` in form state
- Selected tags rendered as removable chips (`@TênNgười`, `@TênFarm`) above the button
- Limit: max 5 tags per post

No backend schema changes needed — `tags[]` field already exists on Post.

---

## Summary of New Backend Endpoints

| Method | Path | Module |
|---|---|---|
| `POST` | `/api/auth/forgot-password` | Auth |
| `POST` | `/api/auth/verify-otp` | Auth |
| `POST` | `/api/auth/reset-password` | Auth |
| `PATCH` | `/api/users/profile/password` | Users |
| `GET` | `/api/users/search` | Users |
| `POST` | `/api/reviews` | Reviews (new) |
| `GET` | `/api/reviews` | Reviews (new) |
| `GET` | `/api/reviews/my` | Reviews (new) |
| `DELETE` | `/api/reviews/:id` | Reviews (new) |
| `GET` | `/api/admin/posts` | Admin |
| `DELETE` | `/api/admin/posts/:id` | Admin |

## Summary of New Frontend Screens

- `src/app/forgot-password.tsx`
- `src/app/verify-otp.tsx`
- `src/app/reset-password.tsx`
- `src/app/products/add-review.tsx`
- `src/app/admin/posts.tsx`
- `src/app/admin/products.tsx`
- `src/app/admin/reviews.tsx`

## Dependencies & Environment

- `nodemailer` + `@types/nodemailer` — install with `npm install nodemailer && npm install -D @types/nodemailer` in `f2t-backend`
- New env vars (optional — app degrades gracefully if not set):
  ```
  SMTP_HOST=smtp.mailtrap.io
  SMTP_PORT=587
  SMTP_USER=<mailtrap_user>
  SMTP_PASS=<mailtrap_pass>
  ```
- No new frontend packages required
