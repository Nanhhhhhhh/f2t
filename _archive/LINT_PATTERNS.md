# LINT_PATTERNS.md — Canonical Code Patterns for F2T Backend

> The agent must read this file before writing any service or schema code.
> Every pattern here is the ONLY acceptable way to write that construct.
> Using any other pattern will cause lint errors.

---

## 1. ObjectId → String conversion

```typescript
// ❌ NEVER — triggers no-base-to-string
farm.ownerId.toString()
String(doc.fieldId)
`${doc.fieldId}`
String(doc.fieldId as unknown as string)

// ✅ ALWAYS — cast to Types.ObjectId first, then toHexString()
import { Types } from 'mongoose';
(doc.ownerId as Types.ObjectId).toHexString()

// ✅ Also acceptable when field is already typed as Types.ObjectId in schema
doc.ownerId.toHexString()
```

---

## 2. String → ObjectId conversion

```typescript
// ❌ NEVER — no validation
new Types.ObjectId(id)

// ✅ ALWAYS — validate first, then convert
if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException('Invalid ID format');
}
const objectId = new Types.ObjectId(id);
```

---

## 3. Mongoose document field typing in services

```typescript
// ❌ NEVER — unsafe assignment warning
const farm = await this.farmModel.findById(id).exec();
const ownerId = farm.ownerId; // typed as any by Mongoose

// ✅ ALWAYS — assert the type explicitly
const farm = await this.farmModel.findById(id).exec();
if (!farm) throw new NotFoundException('Farm not found');
const ownerId = (farm.ownerId as Types.ObjectId).toHexString();
```

---

## 4. Service method that receives a string id — full safe pattern

```typescript
// ✅ Full safe pattern for every service method that receives an id:
async findOne(id: string): Promise<FarmDocument> {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid ID format');
  }
  const farm = await this.farmModel.findById(id).exec();
  if (!farm) {
    throw new NotFoundException(`Farm with id ${id} not found`);
  }
  return farm;
}
```

---

## 5. Schema Mixed types — avoid `any`

```typescript
// ❌ NEVER
@Prop({ type: Object })
metadata: any;

businessHours: any;
deliveryZones: any[];

// ✅ ALWAYS
@Prop({ type: MongooseSchema.Types.Mixed })
metadata: Record<string, unknown>;

@Prop({ type: MongooseSchema.Types.Mixed })
businessHours: Record<string, unknown>;

@Prop({ type: [MongooseSchema.Types.Mixed] })
deliveryZones: Record<string, unknown>[];
```

---

## 6. Async service methods — always await

```typescript
// ❌ NEVER — no-floating-promises
this.notificationsService.create(notification);
someModel.save();

// ✅ ALWAYS — await or void
await this.notificationsService.create(notification);

// If intentionally fire-and-forget (background task):
void this.notificationsService.create(notification);
// But only use void if you genuinely don't need the result
```

---

## 7. DTO body types — never use `any` or raw model type

```typescript
// ❌ NEVER
async update(id: string, data: any)
async update(id: string, data: Partial<User>)  // User is a Mongoose class

// ✅ ALWAYS — use the typed DTO
async update(id: string, data: UpdateUserDto): Promise<UserDocument>
```

---

## 8. findByIdAndUpdate — explicit field list, not spread

```typescript
// ❌ NEVER — mass assignment risk + no-unsafe-assignment
await this.model.findByIdAndUpdate(id, { ...dto });

// ✅ ALWAYS — explicit field mapping
await this.model.findByIdAndUpdate(
  id,
  {
    name: dto.name,
    description: dto.description,
    // list every field explicitly
  },
  { new: true },
).exec();
```

---

## 9. Password field — always use select: false + explicit select when needed

```typescript
// Schema:
@Prop({ required: true, select: false })
password: string;

// When you need the password (auth only):
const user = await this.userModel
  .findOne({ email })
  .select('+password')   // explicitly opt-in
  .exec();

// Normal queries — password is automatically excluded
const user = await this.userModel.findById(id).exec();
// user.password is undefined — correct
```

---

## 10. Populate — always type the result

```typescript
// ❌ NEVER — returns any
const order = await this.orderModel.findById(id).populate('farmId').exec();
const farmName = order.farmId.name; // any — triggers unsafe-member-access

// ✅ ALWAYS — use a typed interface for populated results
interface PopulatedOrder extends Omit<OrderDocument, 'farmId'> {
  farmId: FarmDocument;
}
const order = await this.orderModel
  .findById(id)
  .populate<{ farmId: FarmDocument }>('farmId', 'name logoUrl')
  .exec() as PopulatedOrder | null;
```

---

## 11. Aggregation pipeline — type the result

```typescript
// ❌ NEVER — returns any[]
const result = await this.orderModel.aggregate([...]);

// ✅ ALWAYS — type the expected shape
interface OrderStats {
  total: number;
  revenue: number;
}
const result = await this.orderModel.aggregate<OrderStats>([
  { $match: { farmId: new Types.ObjectId(farmId) } },
  { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
]);
const stats = result[0] ?? { total: 0, revenue: 0 };
```

---

## 12. Regex search — always escape user input

```typescript
// ❌ NEVER — ReDoS vulnerability
{ name: { $regex: userInput, $options: 'i' } }

// ✅ ALWAYS — escape first
const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
{ name: { $regex: escaped, $options: 'i' } }
```

---

## 13. Enum fields — use TypeScript enum, not string literal

```typescript
// ❌ NEVER — string literal union, no runtime validation
role: 'consumer' | 'farm'

// ✅ ALWAYS — TypeScript enum + IsEnum decorator
export enum UserRole {
  Consumer = 'consumer',
  Farm = 'farm',
}

// In schema:
@Prop({ required: true, enum: Object.values(UserRole) })
role: UserRole;

// In DTO:
@IsEnum(UserRole)
role: UserRole;
```

---

## 14. Error handling in services — never swallow errors silently

```typescript
// ❌ NEVER
try {
  await this.model.save();
} catch (e) {
  // silent
}

// ✅ ALWAYS — rethrow or convert to HttpException
try {
  await doc.save();
} catch (error: unknown) {
  if (error instanceof Error && error.message.includes('duplicate key')) {
    throw new ConflictException('Resource already exists');
  }
  throw error; // rethrow unknown errors
}
```

---

## 15. Environment variables — always use ConfigService, never process.env directly

```typescript
// ❌ NEVER
const secret = process.env.JWT_SECRET;

// ✅ ALWAYS
constructor(private configService: ConfigService) {}

const secret = this.configService.get<string>('JWT_SECRET');
if (!secret) throw new Error('JWT_SECRET is not configured');
```

---

## Quick Reference: Common Error → Fix

| ESLint error | Pattern to use |
|---|---|
| `no-base-to-string` on ObjectId | `(field as Types.ObjectId).toHexString()` |
| `no-unsafe-assignment` from Mongoose | Cast with `as TypeName` after null check |
| `no-floating-promises` | Add `await` or prefix with `void` |
| `no-explicit-any` on DTO | Create and use a typed DTO class |
| `no-explicit-any` on schema field | Use `Record<string, unknown>` or `MongooseSchema.Types.Mixed` |
| `no-unsafe-member-access` on populate | Use `.populate<{ field: Type }>()` generic |
| `restrict-template-expressions` | Use `.toHexString()` or `.toString()` explicitly |
| `no-misused-promises` | Don't pass async callbacks to non-async expecting args |
| `no-unnecessary-condition` | Type variables explicitly as `T | undefined` if they can be null/undefined |
| `explicit-module-boundary-types` | Always add explicit return types (e.g. `Promise<UserDocument>`) on public controller/service methods |
| `no-misused-spread` | Map properties explicitly or use `Object.entries(dto).reduce(...)` instead of spreading `...dto` class instances |
| `use-unknown-in-catch-callback-variable` | Always type catch error as `unknown` (`catch (err: unknown) { ... }`) |

---


## 17. Catch Error Variables

```typescript
// ❌ NEVER — defaults to any
} catch (err) {
  console.log(err.message);
}

// ✅ ALWAYS — use unknown and type check
} catch (err: unknown) {
  if (err instanceof Error) console.log(err.message);
}
```

## 18. Explicit Module Boundary Types

```typescript
// ❌ NEVER — relying on inference
async getAnalytics(id: string) {
  return { total: 1 };
}

// ✅ ALWAYS — explicitly declare return types on all controller/service methods
export interface AnalyticsResponse { total: number; }
async getAnalytics(id: string): Promise<AnalyticsResponse> {
  return { total: 1 };
}
```
