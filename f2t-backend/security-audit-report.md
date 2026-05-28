# SECURITY & TYPE AUDIT REPORT — F2T Backend
Date: 2026-04-26

## Summary
| Category              | Issues Found | Critical | High | Medium | Low |
|-----------------------|-------------|----------|------|--------|-----|
| Type Safety (any)     | 6           | 1        | 5    | 0      | 0   |
| Input Validation      | 6           | 3        | 3    | 0      | 0   |
| Integrity Constraints | 2           | 0        | 2    | 0      | 0   |
| Security              | 4           | 2        | 2    | 0      | 0   |
| TOTAL                 | 18          | 6        | 12   | 0      | 0   |

## Overall Verdict: [X] NEEDS FIXES

---

## Findings

### CATEGORY 1: TYPE SAFETY

### SEC-001
Category: Type Safety
Severity: 🔴 CRITICAL
File: src/modules/orders/dto/order.dto.ts:33
Finding: `any` used on a request body DTO field, entirely bypassing the ValidationPipe.
Evidence: `@IsOptional() @IsObject() shippingAddress?: any;`
Fix: 
```typescript
@IsOptional()
@ValidateNested()
@Type(() => ShippingAddressDto)
shippingAddress?: ShippingAddressDto;
```

### SEC-002
Category: Type Safety
Severity: 🟠 HIGH
File: src/modules/orders/schemas/order.schema.ts:123
Finding: `any` used on a Mongoose schema field, disabling type checking for documents.
Evidence: `shippingAddress: any;`
Fix: 
```typescript
@Prop({ type: MongooseSchema.Types.Mixed })
shippingAddress?: Record<string, unknown>;
// Or better, define a proper nested schema
```

### SEC-003
Category: Type Safety
Severity: 🟠 HIGH
File: src/modules/notifications/schemas/notification.schema.ts:32
Finding: `any` used on a Mongoose schema field.
Evidence: `data?: any;`
Fix: 
```typescript
@Prop({ type: MongooseSchema.Types.Mixed })
data?: Record<string, unknown>;
```

### SEC-004
Category: Type Safety
Severity: 🟠 HIGH
File: src/modules/posts/posts.service.ts:10
Finding: `any` used as a service method argument, bypassing type-checking.
Evidence: `async create(userId: string, postData: any): Promise<PostDocument> {`
Fix: 
```typescript
async create(userId: string, postData: CreatePostDto): Promise<PostDocument> {
```

### SEC-005
Category: Type Safety
Severity: 🟠 HIGH
File: src/modules/farms/schemas/farm.schema.ts:72
Finding: `any[]` used on a Mongoose schema field.
Evidence: `deliveryZones: any[];`
Fix: 
```typescript
@Prop({ type: [MongooseSchema.Types.Mixed] })
deliveryZones: Record<string, unknown>[];
```

### SEC-006
Category: Type Safety
Severity: 🟠 HIGH
File: src/modules/farms/schemas/farm.schema.ts:75
Finding: `any` used on a Mongoose schema field.
Evidence: `businessHours: any;`
Fix: 
```typescript
@Prop({ type: MongooseSchema.Types.Mixed })
businessHours: Record<string, unknown>;
```

---

### CATEGORY 2: INPUT VALIDATION & SANITIZATION

### SEC-007
Category: Input Validation
Severity: 🔴 CRITICAL
File: src/modules/users/users.controller.ts:55
Finding: The profile update endpoint accepts `Partial<User>` instead of a dedicated DTO. This bypasses `@Body()` validation since `User` is a Mongoose schema class with no `class-validator` decorators.
Evidence: `@Body() updateData: Partial<User>`
Fix: 
```typescript
@Body() updateData: UpdateProfileDto
```

### SEC-008
Category: Input Validation
Severity: 🔴 CRITICAL
File: src/modules/farms/farms.controller.ts:90
Finding: The `updateDeliveryZones` endpoint accepts `unknown[]` directly from the request body without validation.
Evidence: `@Body() zones: unknown[]`
Fix: 
```typescript
@Body() zones: UpdateDeliveryZonesDto
```

### SEC-009
Category: Input Validation
Severity: 🔴 CRITICAL
File: src/modules/farms/farms.controller.ts:103
Finding: The `updateBusinessHours` endpoint accepts `unknown` directly from the request body without validation.
Evidence: `@Body() hours: unknown`
Fix: 
```typescript
@Body() hours: UpdateBusinessHoursDto
```

### SEC-010
Category: Input Validation
Severity: 🟠 HIGH
File: src/main.ts:16-20
Finding: `enableImplicitConversion: true` is missing from the global `ValidationPipe`. This can cause issues with numeric and boolean `@Query()` parameters not transforming correctly if not manually mapped via `@Type()`.
Evidence: 
```typescript
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
```
Fix: 
```typescript
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
```

### SEC-011
Category: Input Validation
Severity: 🟠 HIGH
File: src/modules/orders/dto/order.dto.ts:66-67
Finding: Unbounded query limits. The `@Query()` parameters `page` and `limit` do not use `@Max()` or set a default value in the class, allowing malicious users to query millions of records in a single request.
Evidence: 
```typescript
  @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @IsOptional() @IsNumber() @Type(() => Number) limit?: number;
```
Fix: 
```typescript
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number) page?: number = 1;
  @IsOptional() @IsNumber() @Min(1) @Max(100) @Type(() => Number) limit?: number = 10;
```

### SEC-012
Category: Input Validation
Severity: 🟠 HIGH
File: src/modules/orders/orders.service.ts:148
Finding: The service receives an `id` string from the controller and passes it directly to Mongoose without checking `Types.ObjectId.isValid(id)`. This will cause an uncaught BSON CastError (HTTP 500) if an invalid string is passed.
Evidence: `const order = await this.orderModel.findById(id).exec();`
Fix: 
```typescript
if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID format');
```

---

### CATEGORY 3: INTEGRITY CONSTRAINTS

### SEC-013
Category: Integrity Constraints
Severity: 🟠 HIGH
File: src/modules/users/schemas/user.schema.ts:24
Finding: The `password` field in the user schema does not explicitly set `select: false`. While `toJSON` hides it from HTTP responses, internal Mongoose queries (`findOne`, `find`) will return the hashed password by default, increasing the risk of accidental exposure in logs or unmapped services.
Evidence: `@Prop({ required: true }) password: string;`
Fix: 
```typescript
@Prop({ required: true, select: false })
password: string;
```

### SEC-014
Category: Integrity Constraints
Severity: 🟠 HIGH
File: src/modules/users/schemas/user.schema.ts:80
Finding: The `refreshToken` field does not use `select: false`.
Evidence: `@Prop() refreshToken?: string;`
Fix: 
```typescript
@Prop({ select: false })
refreshToken?: string;
```

---

### CATEGORY 4: SECURITY VULNERABILITIES

### SEC-015
Category: Security
Severity: 🔴 CRITICAL
File: src/modules/users/users.service.ts:33
Finding: Mass Assignment vulnerability. The `updateData` parameter spreads directly into `findByIdAndUpdate`. Because the controller (SEC-007) passes `Partial<User>`, any user can send a PATCH request with `{"role": "farm"}` or `{"status": "active"}` to arbitrarily elevate their privileges.
Evidence: 
```typescript
  async update(id: string, updateData: Partial<User>): Promise<UserDocument | null> {
    const dataToUpdate = { ...updateData };
    // ...
    return this.userModel.findByIdAndUpdate(id, dataToUpdate, { new: true }).exec();
```
Fix: 
```typescript
  async update(id: string, updateData: UpdateProfileDto): Promise<UserDocument | null> {
    const dataToUpdate = {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        phoneNumber: updateData.phoneNumber,
        location: updateData.location,
    };
    // ...
```

### SEC-016
Category: Security
Severity: 🔴 CRITICAL
File: src/modules/orders/orders.service.ts:171-182
Finding: Broken Object Level Authorization (BOLA). `updateStatus` fetches an order by ID and updates its status **without checking if the requester (the farm) actually owns the order**. An authenticated farm could change the status of another farm's orders by guessing the order ID.
Evidence: 
```typescript
  async updateStatus(id: string, userId: string, status: string, message?: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    // Proceeds directly to update without verifying order.farmId === farm associated with userId
```
Fix: 
```typescript
    const farm = await this.farmsService.findOneByOwner(userId);
    if (String(order.farmId) !== String(farm?._id)) {
      throw new ForbiddenException('You do not own this order');
    }
```

### SEC-017
Category: Security
Severity: 🟠 HIGH
File: global configuration
Finding: Rate limiting (`@nestjs/throttler`) is completely absent. The login endpoint (`/auth/login`) is vulnerable to unlimited brute-force attacks.
Evidence: `grep` search for `throttler|ThrottlerGuard|@Throttle` yielded no results.
Fix: Install `@nestjs/throttler` and add a global or auth-specific rate limiter in `app.module.ts`.

### SEC-018
Category: Security
Severity: 🟠 HIGH
File: src/modules/farms/farms.service.ts:55
Finding: Regular Expression Denial of Service (ReDoS) vulnerability. Raw user input (`search`) is passed directly into a `$regex` operator without escaping special regex characters.
Evidence: `filter.name = { $regex: search, $options: 'i' };`
Fix: 
```typescript
filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
```

---

## What Passed (clean checks)
- **JWT Handling**: Access and refresh tokens are securely generated with non-hardcoded secrets (`JWT_SECRET` and `JWT_REFRESH_SECRET`) in `AuthService` and `JwtStrategy`. `ignoreExpiration: false` is active.
- **Error Leakage**: `HttpExceptionFilter` intercepts exceptions properly. It forwards `message` but safely catches unknown/internal errors as `'Internal server error'`, ensuring stack traces do not leak to the frontend.
- **Unique Indexes**: Email is correctly configured with `@Prop({ required: true, unique: true, lowercase: true, trim: true })` in the user schema.
- **Roles Guard on Endpoints**: Appropriate data mutation routes in `FarmsController` and `ProductsController` are protected with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('farm')`.
- **Order Business Logic**: `OrdersService.create` properly validates whether the products being ordered actually belong to the requested `farmId` before checking out.
- **Stock validation**: `OrdersService.create` checks `product.availableQuantity < item.quantity` before allowing a purchase.
