# PHASE 4 — Profile Editing + Profile Images

## CONTEXT
Read CONTEXT.md first. That is your memory.
Phases 1–3 are complete. The Upload Module (Phase 2) is available — use it.
This phase wires avatar/image upload into User, Farm, and Product profiles.
Backend and frontend both need changes.

---

## YOUR TASK THIS SESSION
1. Wire profile image upload for Users, Farms, and Products
2. Ensure all profile edit endpoints fully save every editable field
3. Wire the frontend edit screens to the backend

---

## STEP 1 — INVESTIGATE FIRST

```bash
# Frontend edit screens
find f2t-frontend/src/app -name "*edit*" -o -name "*profile*" | sort
cat f2t-frontend/src/api/users/use-update-profile.tsx
cat f2t-frontend/src/api/farms/use-update-farm.tsx
cat f2t-frontend/src/api/products/use-update-product.tsx

# What image fields do the hooks send?
grep -rn "avatar\|image\|photo\|profileImage\|coverImage" \
  f2t-frontend/src/api/ --include="*.tsx"

# Backend current state
cat f2t-backend/src/modules/users/schemas/user.schema.ts
cat f2t-backend/src/modules/farms/schemas/farm.schema.ts
cat f2t-backend/src/modules/products/schemas/product.schema.ts
cat f2t-backend/src/modules/users/dto/update-profile.dto.ts
```

Build field gap table:

| Entity | Frontend sends | Schema has field | DTO allows field | Gap |
|--------|---------------|-----------------|-----------------|-----|
| User | avatarUrl | | | |
| User | firstName | | | |
| User | phoneNumber | | | |
| Farm | coverImageUrl | | | |
| Farm | logoUrl | | | |
| Product | images[] | | | |
| ... | ... | | | |

---

## STEP 2 — BACKEND: SCHEMA + DTO UPDATES

### User schema — add missing image fields if not present:
```typescript
@Prop({ default: '' })
avatarUrl: string;

@Prop({ default: '' })
firstName: string;

@Prop({ default: '' })
lastName: string;
```

### Farm schema — add missing image fields if not present:
```typescript
@Prop({ default: '' })
logoUrl: string;

@Prop({ default: '' })
coverImageUrl: string;
```

### Product schema — verify images field:
```typescript
@Prop({ type: [String], default: [] })
images: string[];
```

### Update `UpdateProfileDto` — add image field:
```typescript
@IsOptional() @IsUrl() @IsString()
avatarUrl?: string;
```

### Update `UpdateFarmDto` — add image fields:
```typescript
@IsOptional() @IsUrl() @IsString()
logoUrl?: string;

@IsOptional() @IsUrl() @IsString()
coverImageUrl?: string;
```

### Update `UpdateProductDto` — add images field:
```typescript
@IsOptional() @IsArray() @IsUrl({}, { each: true })
images?: string[];
```

### UsersService — ensure safeUpdate includes image field:
```typescript
// In update() method, add to safeUpdate:
if (updateData.avatarUrl !== undefined) safeUpdate.avatarUrl = updateData.avatarUrl;
```

---

## STEP 3 — FRONTEND WIRING

For each edit screen, follow this pattern:

### Image upload flow (applies to User avatar, Farm logo, Product images):
```typescript
// 1. User taps the avatar/image area
// 2. expo-image-picker opens
// 3. User selects image
// 4. App POSTs the image to POST /api/uploads/image
//    with Authorization: Bearer token
//    FormData field name: "file"
// 5. Response: { success: true, data: { url: "https://..." } }
// 6. Store the URL in local form state
// 7. When user saves the form, include the URL in the profile update body
```

### User profile edit screen:
```bash
cat f2t-frontend/src/app/(app)/profile/edit.tsx  # or find the actual path
```
- Pre-fill form with data from `GET /api/auth/me`
- Fields: firstName, lastName, phoneNumber, location, avatarUrl
- On save: call `PUT /api/users/profile` with all changed fields + new avatarUrl

### Farm profile edit screen:
```bash
cat f2t-frontend/src/app/(app)/farm/edit.tsx  # or find the actual path
```
- Pre-fill with data from `GET /api/farms/:id`
- Fields: name, description, deliveryMethods, deliveryZones, businessHours, logoUrl, coverImageUrl
- On save: call `PUT /api/farms/:id`

### Product edit screen:
```bash
find f2t-frontend/src/app -name "*product*" | sort
```
- Pre-fill with data from `GET /api/products/:id`
- Fields: name, description, category, pricePerUnit, unit, availableQuantity, isOrganic, images[]
- Images: allow adding/removing URLs from the array
- On save: call `PUT /api/products/:id`

---

## STEP 4 — VERIFICATION

# Read LINT_PATTERNS.md. It has 15 canonical patterns covering every error the agent was repeatedly hitting: ObjectId conversion, schema Mixed types, floating promises, populate typing, aggregation typing, regex escaping, enum definitions. The agent can consult the quick reference table at the bottom to map any lint error to the correct fix in under 5 seconds.

```bash
npm run build && npm run lint && npm test

# Test user profile image update
curl -s -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"avatarUrl": "https://cloudinary.com/test-avatar.jpg", "firstName": "Nguyễn"}' \
  | jq '.data.avatarUrl, .data.firstName'
# Must return the new values

# Confirm role cannot be changed (SEC-015 regression check)
curl -s -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "farm"}' | jq '.data.role'
# Must still return "consumer"

# Test farm image update
curl -s -X PUT http://localhost:3000/api/farms/$FARM_ID \
  -H "Authorization: Bearer $FARM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"logoUrl": "https://cloudinary.com/farm-logo.jpg"}' \
  | jq '.data.logoUrl'
# Must return new URL

# Test product image update
curl -s -X PUT http://localhost:3000/api/products/$PRODUCT_ID \
  -H "Authorization: Bearer $FARM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"images": ["https://cloudinary.com/tomato1.jpg"]}' \
  | jq '.data.images'
# Must return the array

# Test wrong owner cannot update farm (regression check)
curl -s -X PUT http://localhost:3000/api/farms/$FARM_ID \
  -H "Authorization: Bearer $OTHER_FARM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hacked Farm"}' | jq '.statusCode'
# Must return 403
```

---

## STEP 5 — UPDATE CONTEXT.md

At session end, update CONTEXT.md:
- Mark Phase 4 (Profile Editing + Images) as ✅ Complete
- Note which image fields were added to which schemas
- Output full updated CONTEXT.md

---

## RULES
- Upload is done via the existing Upload Module — do not create a new upload route
- Image URLs in profile DTOs are just strings — the frontend uploads first, gets the URL, then sends the URL in the profile update body
- `avatarUrl`, `logoUrl`, `coverImageUrl` must never be required fields — always optional
- The SEC-015 regression check (role cannot be changed) must still pass
- Do not touch Orders, Notifications, or Posts in this session
- `npm run build && npm run lint && npm test` must pass

## START
Say: **"Starting Phase 4 — Profile Editing + Images. Reading frontend edit screens and current schemas."**