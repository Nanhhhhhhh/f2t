# Detailed Codebase Investigation Report

This report documents the findings and proposed solutions for the issues identified in the Farm-to-Table (F2T) application.

## 1. Dashboard "Quick Action" Issues (Farm Role)

### Problem
Most buttons in the "Quick Action" box on the dashboard lead to "oops" screens.

### Root Cause
In `f2t-frontend/src/components/dashboard/farm-dashboard.tsx`, the `useDashboardData` hook uses incorrect route paths that do not exist in the Expo Router configuration.
- `handleEditProfile` navigates to `/farms/${farm.id}/edit` (Expected: `/farm/edit`)
- `handleManageProducts` navigates to `/dashboard/products` (Expected: `/inventory`)
- `handleViewOrders` navigates to `/dashboard/orders` (Expected: `/farm/orders`)
- `handleViewAnalytics` navigates to `/dashboard/analytics` (Does not exist)

### Suggested Fix
Update the navigation paths in `f2t-frontend/src/components/dashboard/farm-dashboard.tsx` to match the actual file structure in `f2t-frontend/src/app`.

---

## 2. Profile and Navigation Inconsistencies

### Problem
- "Edit profile" button in the profile page leads to a generic user edit page instead of `farm/edit`.
- The user wants to keep only the `farm/edit` page for farm owners.

### Root Cause
In `f2t-frontend/src/app/(app)/profile.tsx`, the `handleEditProfile` function is hardcoded to `router.push('/profile/edit')`.

### Suggested Fix
Update `f2t-frontend/src/app/(app)/profile.tsx` to check if `isUserFarm` is true and navigate to `/farm/edit` instead of `/profile/edit`.

---

## 3. Farm/Edit Page "Save Changes" Button

### Problem
The "Save Changes" button in the `farm/edit` page doesn't seem to send any request.

### Root Cause
1. **Validation Failure:** `FarmProfileEditForm` uses a Zod schema for validation. If any field fails validation (e.g., description too short, missing required field), the `onSubmit` function is never called, and no request is sent. The UI might not be clearly showing all validation errors.
2. **Backend Rejection:** If the request *is* sent, it might be rejected by the backend due to `@IsUrl()` validation on `logoUrl` or `coverImageUrl` if they are not absolute URLs.

### Suggested Fix
- Ensure all validation errors are visible in `FarmProfileEditForm`.
- In `f2t-backend`, relax the `@IsUrl()` constraint in `UpdateFarmDto` or ensure the frontend always sends absolute URLs.
- In `f2t-frontend/src/app/(app)/farm/edit.tsx`, ensure `onSuccess` correctly updates the local auth state with the new farm data.

---

## 4. Products Page for Farm Role

### Problem
- The "Products" page for farms should only show their products.
- They need edit/delete/hide functionality.

### Root Cause
The "Products" tab in the bottom bar currently points to `/products` (`f2t-frontend/src/app/(app)/products.tsx`), which is designed for consumers to browse all products.

### Suggested Fix
Modify `f2t-frontend/src/app/(app)/_layout.tsx` to change the `href` and `title` of the Products tab for farm roles.
- **Consumer:** Title: "Products", Href: "/products"
- **Farm:** Title: "Inventory", Href: "/inventory" (This screen already exists and supports farm-specific filtering and management).

---

## 5. "Add Product" Page Crash and Parameter Issues

### Problem
- "Choose photo" button crashes the app.
- Backend doesn't "serve" all parameters sent in the request.

### Root Cause
1. **Crash:** Likely an issue in `ProductImagePicker` (`f2t-frontend/src/components/products/image-picker.tsx`) when interacting with `expo-image-picker`. This often happens if permissions aren't handled correctly or if there's a version mismatch.
2. **Parameters:** `f2t-backend/src/modules/products/dto/product.dto.ts` is missing many fields that the frontend sends (e.g., `harvestDate`, `farmingMethods`, `tags`). Since the backend uses `whitelist: true` and `forbidNonWhitelisted: true`, it rejects requests containing these extra fields with a `400 Bad Request`.

### Suggested Fix
- **Crash:** Wrap `ImagePicker` calls in more robust try-catch blocks and verify permission handling in `ProductImagePicker`.
- **Backend:** Update `CreateProductDto` and `UpdateProductDto` in `f2t-backend` to include all fields defined in the `Product` schema and sent by the frontend.

---

## 6. Layout and Tab Bar for Farm Role

### Problem
- Farm role shouldn't see "Farms" tab.
- Farm role should have an "Orders" button in the bottom bar leading to their orders.

### Root Cause
`f2t-frontend/src/app/(app)/_layout.tsx` shows the "Farms" tab to all roles and doesn't have a conditional "Orders" tab.

### Suggested Fix
Update `f2t-frontend/src/app/(app)/_layout.tsx`:
- Set `href: isUserFarm ? null : '/farms'` for the "Farms" tab.
- Add a new `Tabs.Screen` for "Orders" that only shows for farms (`href: isUserFarm ? '/farm/orders' : null`).

---

## 7. Order Management for Farm Role

### Problem
- Farms should see only their orders.
- Farms should be able to edit order status and payment status.

### Root Cause
1. **Filtering:** `f2t-frontend/src/app/(app)/farm/orders.tsx` calls `useGetOrders` without passing the `farmId`.
2. **Editing:** `f2t-frontend/src/app/orders/[id].tsx` lacks UI controls for status updates.

### Suggested Fix
- In `f2t-frontend/src/app/(app)/farm/orders.tsx`, pass `farm?.id` to the `useGetOrders` hook.
- In `f2t-frontend/src/app/orders/[id].tsx`, add a "Manage Order" section for farm owners that allows updating `status` and `paymentStatus` using the `useUpdateOrder` hook.

---

## 8. "avatarUrl must be a URL address" Error

### Problem
Validation error on `avatarUrl` (and possibly other media URLs).

### Root Cause
The backend DTOs (`UpdateProfileDto`, `UpdateFarmDto`, `CreateProductDto`) use `@IsUrl()` from `class-validator`. If the uploaded image URL returned by the server is relative (e.g., `/uploads/...`) or lacks a protocol, `IsUrl` will fail.

### Suggested Fix
- Update `f2t-backend` DTOs to use `@IsString()` instead of `@IsUrl()` for media fields, or configure `@IsUrl()` to allow relative paths/specific domains.
- Ensure the file upload service returns absolute URLs if `@IsUrl()` is to be kept.

---

## Summary of Proposed Changes

### Frontend
1. **`src/app/(app)/_layout.tsx`**: Update tabs visibility and destinations based on user role.
2. **`src/app/(app)/profile.tsx`**: Conditional navigation for the Edit button.
3. **`src/components/dashboard/farm-dashboard.tsx`**: Correct quick action routes.
4. **`src/app/(app)/farm/orders.tsx`**: Pass `farmId` to orders query.
5. **`src/app/orders/[id].tsx`**: Add order status management UI for farms.
6. **`src/components/products/image-picker.tsx`**: Robust error handling for `ImagePicker`.

### Backend
1. **`src/modules/products/dto/product.dto.ts`**: Add missing fields to DTOs.
2. **`src/modules/users/dto/update-profile.dto.ts`**: Relax `avatarUrl` validation.
3. **`src/modules/farms/dto/farm.dto.ts`**: Relax `logoUrl` and `coverImageUrl` validation.
