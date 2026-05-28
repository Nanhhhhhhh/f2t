# Feature Implementation Plan

This document outlines the investigation and strategic plan for implementing the 8 requested features across the F2T (Farm-to-Table) frontend and backend codebase.

---

## 1. Phone and Email Verification
**Current State:** 
- Frontend: Hook shells (`use-verify-email.tsx`, `use-verify-phone.tsx`) and a `verification.tsx` screen exist.
- Backend: No verification logic or endpoints exist in the `auth` module.

**Implementation Plan:**
1. **Backend:**
   - Create a `VerificationToken` schema to store OTPs with an expiration time.
   - Add `POST /auth/send-verification` (generates OTP, saves to DB, sends via Email/SMS).
   - Add `POST /auth/verify` (validates OTP, marks user `emailVerified` or `phoneVerified` as true).
   - Integrate 3rd-party services: Nodemailer/SendGrid for emails, and Twilio/AWS SNS for SMS.
2. **Frontend:**
   - Wire up `verification.tsx` to call these new endpoints.
   - Add routing logic to force unverified users to the verification screen upon login/registration.

---

## 2. Search, Filter, Sort, and Pagination (Farms & Products)
**Current State:**
- Backend: `products.controller.ts` has a `GetProductsFilterDto` that supports basic `page`, `limit`, and `search` (using MongoDB text search). Sorting is in the DTO but not fully applied to the query. Farm filtering is minimal.
- Frontend: API hooks (`use-get-farms`, `use-get-products`) support passing these parameters, but UI integration is partial.

**Implementation Plan:**
1. **Backend:**
   - Ensure `farms.service.ts` and `products.service.ts` fully apply `.sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })`.
   - Expand `products.service.ts` to handle complex filters (price range, organic status, categories).
   - Expand `farms.service.ts` to handle geospatial queries (`$near`) for location-based searching.
2. **Frontend:**
   - Implement bottom sheets (`@gorhom/bottom-sheet`) in the search screens to allow users to select price ranges, categories, and sorting preferences.
   - Debounce search inputs to prevent API spam.

---

## 3. Posts (Text and Media)
**Current State:**
- Backend: The `Post` schema supports `title`, `body`, and an array of `images` (strings). Video is not explicitly supported.
- Frontend: `add-post.tsx` exists but needs media handling.

**Implementation Plan:**
1. **Backend:**
   - Update `Post` schema: Change `images: string[]` to `media: [{ type: String, url: String }]` to support both images and videos.
   - Create an `/uploads` module to handle multipart/form-data. Upload files to AWS S3 or Cloudinary and return the secure URLs.
2. **Frontend:**
   - Integrate `expo-image-picker` in `add-post.tsx` allowing users to select images or videos.
   - Upload the selected assets to the new `/uploads` endpoint, receive the URLs, and append them to the `POST /posts` request.

---

## 4. Profile Images (User, Farm, Product)
**Current State:**
- Backend: Schemas have image fields (e.g., `Product.images`, `User.profileImageUrl`), but there is no unified way to upload and update them.
- Frontend: The profile UI uses placeholder icons (from `lucide-react-native`).

**Implementation Plan:**
1. **Backend:**
   - Utilize the `/uploads` endpoint (mentioned in step 3).
2. **Frontend:**
   - Add an `expo-image-picker` to the user profile, farm profile, and product creation screens.
   - When a user selects a new avatar, upload it, then call `PUT /users/profile` or `PUT /farms/:id` with the new image URL.
   - Replace placeholder icons in `profile.tsx` with the `Image` component from `expo-image` for caching.

---

## 5. Statistics (Farm and User)
**Current State:**
- Backend: `GET /orders/stats` exists.
- Frontend: `profile.tsx` has hardcoded `consumerStats` and `farmStats`. `use-farm-analytics.tsx` hook exists.

**Implementation Plan:**
1. **Backend:**
   - Create `GET /farms/:id/analytics` to aggregate total products, total orders, revenue, and average rating using MongoDB aggregation pipelines (`$group`, `$sum`).
   - Create `GET /users/profile/stats` to aggregate total spent and order counts for consumers.
2. **Frontend:**
   - Replace the hardcoded stats in `profile.tsx` and `dashboard.tsx` with data fetched from these endpoints using React Query.

---

## 6. Transactions (VNPay/Momo) and Delivery Tracking
**Current State:**
- Backend: `Order` schema tracks payment methods and a string-based `timeline`. No payment gateway integration exists.
- Frontend: Hardcoded timelines in mock data.

**Implementation Plan:**
1. **Backend:**
   - **Payments:** Integrate VNPay/Momo SDKs. Add `POST /orders/:id/payment-url` to generate a payment session. Add a webhook endpoint (`POST /payments/webhook`) to receive payment confirmations from the gateways and update the order `paymentStatus` to `completed`.
   - **Delivery:** Integrate a 3rd-party logistics API (e.g., Ahamove, GHN). Add tracking links or coordinates to the `Order` schema.
2. **Frontend:**
   - Add a `WebView` or use `expo-linking` to open the VNPay/Momo payment portals.
   - For delivery, integrate `react-native-maps` on the order details screen to display driver coordinates if provided by the 3rd-party API.

---

## 7. Profile Editing
**Current State:**
- Backend: `PUT` endpoints exist but require strict validation.
- Frontend: Shell edit screens exist but lack form implementation.

**Implementation Plan:**
1. **Frontend:**
   - Use `react-hook-form` and `zod` in `profile/edit.tsx` and `farm/edit.tsx` for robust client-side validation.
   - Pre-fill forms with the current user/farm data fetched from `auth:me` and `GET /farms/:id`.
2. **Backend:**
   - Ensure DTOs (`UpdateUserDto`, `UpdateFarmDto`) strip out protected fields (like `role` or `balance`) to prevent mass-assignment vulnerabilities during `PUT` requests.

---

## 8. Notifications (Orders & Low Stock)
**Current State:**
- Backend: `Notification` schema exists.
- Frontend: `notifications/index.tsx` screen exists.

**Implementation Plan:**
1. **Backend:**
   - **Orders:** Hook into the `OrdersService` update method. Whenever a status changes (e.g., to `out_for_delivery`), create a `Notification` document for the `customerId`.
   - **Low Stock:** Run a cron job (using `@nestjs/schedule`) every night, or check inventory levels during order placement. If `product.availableQuantity < threshold`, trigger a notification to the `farmId`.
   - **Push:** Integrate Firebase Admin SDK or Expo Push Server to send actual push notifications to devices.
2. **Frontend:**
   - Request push notification permissions using `expo-notifications` on app startup.
   - Send the device push token to the backend (`PUT /users/profile` -> `pushToken`).
   - Handle foreground/background notification listeners to update the UI badge count.