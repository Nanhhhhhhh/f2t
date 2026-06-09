# Auth, Reviews, Admin & Post Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password reset (OTP via email) + change password, product reviews/ratings (verified purchase only), richer admin panel, and fix post tagging UI.

**Architecture:** Four independent subsystems. Backend follows existing NestJS module pattern (controller/service/schema/dto). Frontend uses react-query-kit mutations/queries + Expo Router screens. Reviews is a new standalone module. Password reset reuses existing EmailService + VerificationToken pattern. Admin extends existing module. Post tagging is a frontend-only fix plus one new `GET /users/search` endpoint.

**Tech Stack:** NestJS 11, Mongoose 7, JWT (jsonwebtoken), Nodemailer (already installed), React Native + Expo Router, react-query-kit, Zod, NativeWind

---

## File Map

### Group A — Password Reset & Change Password

**Backend — new files:**
- `f2t-backend/src/modules/auth/schemas/password-reset-token.schema.ts`
- `f2t-backend/src/modules/auth/dto/forgot-password.dto.ts`
- `f2t-backend/src/modules/auth/dto/verify-otp.dto.ts`
- `f2t-backend/src/modules/auth/dto/reset-password.dto.ts`
- `f2t-backend/src/modules/auth/dto/change-password.dto.ts`

**Backend — modified files:**
- `f2t-backend/src/modules/auth/auth.module.ts` — register PasswordResetToken schema
- `f2t-backend/src/modules/auth/auth.service.ts` — add forgotPassword, verifyOtp, resetPassword, changePassword
- `f2t-backend/src/modules/auth/auth.controller.ts` — add 4 new endpoints
- `f2t-backend/src/modules/auth/auth.service.spec.ts` — add tests

**Frontend — new files:**
- `f2t-frontend/src/app/forgot-password.tsx`
- `f2t-frontend/src/app/verify-otp.tsx`
- `f2t-frontend/src/app/reset-password.tsx`
- `f2t-frontend/src/api/auth/use-verify-otp.tsx`
- `f2t-frontend/src/app/(app)/profile/change-password.tsx`

**Frontend — modified files:**
- `f2t-frontend/src/components/login-form.tsx` — add "Quên mật khẩu?" link
- `f2t-frontend/src/api/auth/index.tsx` — export use-verify-otp
- `f2t-frontend/src/types/api.ts` — add VerifyOtpRequest type

### Group B — Reviews & Ratings

**Backend — new files:**
- `f2t-backend/src/modules/reviews/reviews.module.ts`
- `f2t-backend/src/modules/reviews/reviews.controller.ts`
- `f2t-backend/src/modules/reviews/reviews.service.ts`
- `f2t-backend/src/modules/reviews/schemas/review.schema.ts`
- `f2t-backend/src/modules/reviews/dto/create-review.dto.ts`
- `f2t-backend/src/modules/reviews/dto/get-reviews-query.dto.ts`
- `f2t-backend/src/modules/reviews/reviews.service.spec.ts`

**Backend — modified files:**
- `f2t-backend/src/modules/products/schemas/product.schema.ts` — add averageRating, reviewCount
- `f2t-backend/src/app.module.ts` — import ReviewsModule

**Frontend — new files:**
- `f2t-frontend/src/api/reviews/types.ts`
- `f2t-frontend/src/api/reviews/use-get-reviews.tsx`
- `f2t-frontend/src/api/reviews/use-add-review.tsx`
- `f2t-frontend/src/api/reviews/use-delete-review.tsx`
- `f2t-frontend/src/api/reviews/use-my-reviews.tsx`
- `f2t-frontend/src/api/reviews/index.ts`
- `f2t-frontend/src/app/products/add-review.tsx`

**Frontend — modified files:**
- `f2t-frontend/src/app/products/[id].tsx` — add reviews section + write review button

### Group C — Admin Enhancements

**Backend — modified files:**
- `f2t-backend/src/modules/admin/admin.controller.ts` — add GET/DELETE /admin/posts
- `f2t-backend/src/modules/admin/admin.service.ts` — add getPosts, deletePost
- `f2t-backend/src/modules/admin/admin.module.ts` — import PostSchema
- `f2t-backend/src/modules/admin/dto/admin.dto.ts` — add AdminPostsQueryDto

**Frontend — new files:**
- `f2t-frontend/src/app/admin/posts.tsx`
- `f2t-frontend/src/app/admin/products.tsx`
- `f2t-frontend/src/app/admin/reviews.tsx`

**Frontend — modified files:**
- `f2t-frontend/src/app/admin/index.tsx` — add nav buttons for Posts/Products/Reviews
- `f2t-frontend/src/app/admin/users.tsx` — add search input, role filter, expandable detail
- `f2t-frontend/src/app/admin/farms.tsx` — add verificationStatus filter, expandable detail
- `f2t-frontend/src/app/admin/orders.tsx` — add paymentStatus filter, date range, expandable detail

### Group D — Post Tagging Fix

**Backend — modified files:**
- `f2t-backend/src/modules/users/users.controller.ts` — add GET /users/search
- `f2t-backend/src/modules/users/users.service.ts` — add searchUsers method

**Frontend — new files:**
- `f2t-frontend/src/api/users/use-search-users.tsx`

**Frontend — modified files:**
- `f2t-frontend/src/app/feed/add-post.tsx` — add tag picker bottom sheet
- `f2t-frontend/src/api/users/index.ts` — export use-search-users

---

## GROUP A — Password Reset & Change Password

### Task 1: PasswordResetToken schema + DTOs

**Files:**
- Create: `f2t-backend/src/modules/auth/schemas/password-reset-token.schema.ts`
- Create: `f2t-backend/src/modules/auth/dto/forgot-password.dto.ts`
- Create: `f2t-backend/src/modules/auth/dto/verify-otp.dto.ts`
- Create: `f2t-backend/src/modules/auth/dto/reset-password.dto.ts`
- Create: `f2t-backend/src/modules/auth/dto/change-password.dto.ts`

- [ ] **Step 1: Create PasswordResetToken schema**

`f2t-backend/src/modules/auth/schemas/password-reset-token.schema.ts`:
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ required: true, index: true })
  email!: string;

  @Prop({ required: true })
  otp!: string; // bcrypt hashed

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  used!: boolean;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

- [ ] **Step 2: Create DTOs**

`f2t-backend/src/modules/auth/dto/forgot-password.dto.ts`:
```typescript
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}
```

`f2t-backend/src/modules/auth/dto/verify-otp.dto.ts`:
```typescript
import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp!: string;
}
```

`f2t-backend/src/modules/auth/dto/reset-password.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
```

`f2t-backend/src/modules/auth/dto/change-password.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
```

- [ ] **Step 3: Register schema in AuthModule**

In `f2t-backend/src/modules/auth/auth.module.ts`, add to imports and MongooseModule.forFeature:
```typescript
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './schemas/password-reset-token.schema';

// inside MongooseModule.forFeature([...]) array, add:
{ name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
```

- [ ] **Step 4: Commit**
```bash
cd f2t-backend
git add src/modules/auth/schemas/password-reset-token.schema.ts \
        src/modules/auth/dto/forgot-password.dto.ts \
        src/modules/auth/dto/verify-otp.dto.ts \
        src/modules/auth/dto/reset-password.dto.ts \
        src/modules/auth/dto/change-password.dto.ts \
        src/modules/auth/auth.module.ts
git commit -m "feat(auth): PasswordResetToken schema + password reset DTOs"
```

---

### Task 2: Backend — Password reset service methods + tests

**Files:**
- Modify: `f2t-backend/src/modules/auth/auth.service.ts`
- Modify: `f2t-backend/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing tests first**

Add to `f2t-backend/src/modules/auth/auth.service.spec.ts` (find the existing describe block and add these):
```typescript
// At top of file, ensure these imports exist:
// import { PasswordResetToken, PasswordResetTokenDocument } from './schemas/password-reset-token.schema';

describe('forgotPassword', () => {
  it('should return success even if email not found (no enumeration)', async () => {
    jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
    const result = await service.forgotPassword('notfound@test.com');
    expect(result).toEqual({ success: true });
  });

  it('should create otp token and send email when user exists', async () => {
    const mockUser = { _id: { toHexString: () => 'uid1' }, email: 'u@test.com' } as any;
    jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
    const sendOtpSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue();
    await service.forgotPassword('u@test.com');
    expect(sendOtpSpy).toHaveBeenCalledWith('u@test.com', expect.any(String));
  });
});

describe('verifyOtp', () => {
  it('should throw BadRequestException when no token found', async () => {
    mockPasswordResetModel.findOne = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) });
    await expect(service.verifyOtp('u@test.com', '123456')).rejects.toThrow();
  });
});

describe('changePassword', () => {
  it('should throw UnauthorizedException when current password is wrong', async () => {
    const mockUser = { _id: { toHexString: () => 'uid1' }, password: await bcrypt.hash('correct', 10) } as any;
    jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser);
    await expect(service.changePassword('uid1', 'wrong', 'newpass123')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**
```bash
cd f2t-backend
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: tests fail (methods don't exist yet).

- [ ] **Step 3: Add service methods**

In `f2t-backend/src/modules/auth/auth.service.ts`, add to constructor injection:
```typescript
@InjectModel(PasswordResetToken.name)
private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
```

Add these imports at the top:
```typescript
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from './schemas/password-reset-token.schema';
```

Add these methods to `AuthService`:
```typescript
private generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async forgotPassword(email: string): Promise<{ success: boolean }> {
  const user = await this.usersService.findByEmail(email);
  if (!user) return { success: true };

  const otp = this.generateOtpCode();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await this.passwordResetTokenModel.deleteMany({ email });
  await this.passwordResetTokenModel.create({ email, otp: hashedOtp, expiresAt });
  await this.emailService.sendOtpEmail(email, otp);

  return { success: true };
}

async verifyOtp(email: string, otp: string): Promise<{ token: string }> {
  const record = await this.passwordResetTokenModel
    .findOne({ email, used: false, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .exec();

  if (!record) throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');

  const valid = await bcrypt.compare(otp, record.otp);
  if (!valid) throw new BadRequestException('OTP không đúng');

  record.used = true;
  await record.save();

  const user = await this.usersService.findByEmail(email);
  if (!user) throw new BadRequestException('User not found');

  const token = this.jwtService.sign(
    { sub: user._id.toHexString(), purpose: 'password-reset' },
    { expiresIn: '15m' },
  );
  return { token };
}

async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
  let payload: { sub: string; purpose: string };
  try {
    payload = this.jwtService.verify(token);
  } catch {
    throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
  }
  if (payload.purpose !== 'password-reset') throw new BadRequestException('Token không hợp lệ');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await this.usersService.updatePassword(payload.sub, hashedPassword);
  return { success: true };
}

async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  const user = await this.usersService.findById(userId);
  if (!user) throw new UnauthorizedException();

  const userWithPassword = await this.usersService.findByEmail(user.email);
  if (!userWithPassword) throw new UnauthorizedException();

  const valid = await bcrypt.compare(currentPassword, userWithPassword.password);
  if (!valid) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await this.usersService.updatePassword(userId, hashedPassword);
  return { success: true };
}
```

- [ ] **Step 4: Add `updatePassword` to UsersService**

In `f2t-backend/src/modules/users/users.service.ts`, add:
```typescript
async updatePassword(id: string, hashedPassword: string): Promise<void> {
  await this.userModel.updateOne({ _id: id }, { password: hashedPassword }).exec();
}
```

- [ ] **Step 5: Run tests — should pass**
```bash
cd f2t-backend
npx jest src/modules/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 6: Commit**
```bash
cd f2t-backend
git add src/modules/auth/auth.service.ts src/modules/auth/auth.service.spec.ts \
        src/modules/users/users.service.ts
git commit -m "feat(auth): forgotPassword, verifyOtp, resetPassword, changePassword service methods"
```

---

### Task 3: Backend — Password reset controller endpoints

**Files:**
- Modify: `f2t-backend/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Add endpoints to auth.controller.ts**

Add these imports to `auth.controller.ts`:
```typescript
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
```

Add these methods to `AuthController`:
```typescript
@Throttle({ short: { ttl: 60000, limit: 3 } })
@Post('forgot-password')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Request OTP for password reset' })
async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: boolean }> {
  return this.authService.forgotPassword(dto.email);
}

@Throttle({ short: { ttl: 60000, limit: 5 } })
@Post('verify-otp')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Verify OTP and get reset token' })
async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ token: string }> {
  return this.authService.verifyOtp(dto.email, dto.otp);
}

@Post('reset-password')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Reset password using token from verify-otp' })
async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: boolean }> {
  return this.authService.resetPassword(dto.token, dto.newPassword);
}

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Post('change-password')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Change password (authenticated)' })
async changePassword(
  @CurrentUser() user: RequestUser,
  @Body() dto: ChangePasswordDto,
): Promise<{ success: boolean }> {
  return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
}
```

- [ ] **Step 2: Build to verify no TS errors**
```bash
cd f2t-backend
npm run build 2>&1 | tail -20
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Lint**
```bash
cd f2t-backend
npm run lint 2>&1 | tail -10
```
Expected: No errors.

- [ ] **Step 4: Commit**
```bash
cd f2t-backend
git add src/modules/auth/auth.controller.ts
git commit -m "feat(auth): POST forgot-password, verify-otp, reset-password, change-password endpoints"
```

---

### Task 4: Frontend — Password reset screens

**Files:**
- Create: `f2t-frontend/src/api/auth/use-verify-otp.tsx`
- Modify: `f2t-frontend/src/api/auth/index.tsx`
- Modify: `f2t-frontend/src/types/api.ts`
- Create: `f2t-frontend/src/app/forgot-password.tsx`
- Create: `f2t-frontend/src/app/verify-otp.tsx`
- Create: `f2t-frontend/src/app/reset-password.tsx`
- Modify: `f2t-frontend/src/components/login-form.tsx`

- [ ] **Step 1: Add VerifyOtpRequest type**

In `f2t-frontend/src/types/api.ts`, after `ForgotPasswordRequest`:
```typescript
export type VerifyOtpRequest = {
  email: string;
  otp: string;
};
```

- [ ] **Step 2: Create use-verify-otp hook**

`f2t-frontend/src/api/auth/use-verify-otp.tsx`:
```typescript
import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { VerifyOtpRequest } from '@/types/api';

type Response = {
  success: boolean;
  data: { token: string };
};

export const useVerifyOtp = createMutation<Response, VerifyOtpRequest, AxiosError>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/verify-otp',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
```

- [ ] **Step 3: Export from auth index**

In `f2t-frontend/src/api/auth/index.tsx`, add:
```typescript
export * from './use-verify-otp';
```

- [ ] **Step 4: Create forgot-password screen**

`f2t-frontend/src/app/forgot-password.tsx`:
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useForgotPassword } from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
type FormType = z.infer<typeof schema>;

export default function ForgotPassword() {
  const router = useRouter();
  const { mutate, isPending } = useForgotPassword();
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(data, {
      onSuccess: () => {
        router.push({ pathname: '/verify-otp', params: { email: data.email } });
      },
      onError: () => {
        Alert.alert('Lỗi', 'Không thể gửi OTP. Vui lòng thử lại.');
      },
    });
  };

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="mb-2 text-3xl font-bold">Quên mật khẩu</Text>
      <Text className="mb-6 text-gray-500">
        Nhập email của bạn để nhận mã OTP.
      </Text>
      <ControlledInput
        control={control}
        name="email"
        label="Email"
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button
        label={isPending ? 'Đang gửi...' : 'Gửi mã OTP'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        className="mt-4"
      />
      <Button
        label="Quay lại đăng nhập"
        variant="ghost"
        onPress={() => router.back()}
        className="mt-2"
      />
    </View>
  );
}
```

- [ ] **Step 5: Create verify-otp screen**

`f2t-frontend/src/app/verify-otp.tsx`:
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useVerifyOtp } from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z.object({
  otp: z.string().length(6, 'Mã OTP phải có 6 chữ số'),
});
type FormType = z.infer<typeof schema>;

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { mutate, isPending } = useVerifyOtp();
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(
      { email: email ?? '', otp: data.otp },
      {
        onSuccess: (res) => {
          router.push({
            pathname: '/reset-password',
            params: { token: res.data.token },
          });
        },
        onError: () => {
          Alert.alert('Lỗi', 'Mã OTP không đúng hoặc đã hết hạn.');
        },
      },
    );
  };

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="mb-2 text-3xl font-bold">Nhập mã OTP</Text>
      <Text className="mb-6 text-gray-500">
        Mã OTP đã được gửi đến {email}
      </Text>
      <ControlledInput
        control={control}
        name="otp"
        label="Mã OTP (6 chữ số)"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
      />
      <Button
        label={isPending ? 'Đang xác minh...' : 'Xác minh'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        className="mt-4"
      />
    </View>
  );
}
```

- [ ] **Step 6: Create reset-password screen**

`f2t-frontend/src/app/reset-password.tsx`:
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useResetPassword } from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z
  .object({
    newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });
type FormType = z.infer<typeof schema>;

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { mutate, isPending } = useResetPassword();
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(
      { token: token ?? '', newPassword: data.newPassword },
      {
        onSuccess: () => {
          Alert.alert('Thành công', 'Mật khẩu đã được đặt lại.', [
            { text: 'Đăng nhập', onPress: () => router.replace('/login') },
          ]);
        },
        onError: () => {
          Alert.alert('Lỗi', 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
        },
      },
    );
  };

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="mb-6 text-3xl font-bold">Đặt mật khẩu mới</Text>
      <ControlledInput
        control={control}
        name="newPassword"
        label="Mật khẩu mới"
        placeholder="Tối thiểu 6 ký tự"
        secureTextEntry
      />
      <ControlledInput
        control={control}
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu mới"
        secureTextEntry
        className="mt-4"
      />
      <Button
        label={isPending ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        className="mt-4"
      />
    </View>
  );
}
```

- [ ] **Step 7: Add "Quên mật khẩu?" link to LoginForm**

In `f2t-frontend/src/components/login-form.tsx`, find the component's return JSX. After the password input and before/after the Sign In button, add:
```typescript
// Add this import at top:
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Inside LoginForm component, add:
const router = useRouter();

// Add this JSX element after the password ControlledInput:
<TouchableOpacity
  onPress={() => router.push('/forgot-password')}
  className="mb-4 self-end"
>
  <Text className="text-sm text-blue-600">Quên mật khẩu?</Text>
</TouchableOpacity>
```

- [ ] **Step 8: Type-check**
```bash
cd f2t-frontend
pnpm type-check 2>&1 | tail -20
```
Expected: No errors.

- [ ] **Step 9: Commit**
```bash
cd f2t-frontend
git add src/api/auth/use-verify-otp.tsx src/api/auth/index.tsx \
        src/types/api.ts \
        src/app/forgot-password.tsx src/app/verify-otp.tsx src/app/reset-password.tsx \
        src/components/login-form.tsx
git commit -m "feat(auth): forgot-password, verify-otp, reset-password screens + hooks"
```

---

### Task 5: Frontend — Change password screen

**Files:**
- Create: `f2t-frontend/src/app/(app)/profile/change-password.tsx`

- [ ] **Step 1: Create change-password screen**

`f2t-frontend/src/app/(app)/profile/change-password.tsx`:
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useChangePassword } from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });
type FormType = z.infer<typeof schema>;

export default function ChangePassword() {
  const router = useRouter();
  const { mutate, isPending } = useChangePassword();
  const { handleSubmit, control, reset } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          reset();
          Alert.alert('Thành công', 'Mật khẩu đã được thay đổi.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: () => {
          Alert.alert('Lỗi', 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra.');
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-gray-50 p-6">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Đổi mật khẩu</Text>
      <ControlledInput
        control={control}
        name="currentPassword"
        label="Mật khẩu hiện tại"
        secureTextEntry
      />
      <ControlledInput
        control={control}
        name="newPassword"
        label="Mật khẩu mới"
        secureTextEntry
        className="mt-4"
      />
      <ControlledInput
        control={control}
        name="confirmPassword"
        label="Xác nhận mật khẩu mới"
        secureTextEntry
        className="mt-4"
      />
      <Button
        label={isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        className="mt-6"
      />
    </View>
  );
}
```

- [ ] **Step 2: Add link to change-password from profile edit screen**

In `f2t-frontend/src/app/(app)/profile/edit.tsx`, find the return JSX and add a navigation link. First read the file to find the right place, then add:
```typescript
// Add this import:
import { useRouter } from 'expo-router';

// Inside the component, add:
const router = useRouter();

// Add this TouchableOpacity in the JSX (after the save button):
<TouchableOpacity
  onPress={() => router.push('/(app)/profile/change-password')}
  className="mt-4 rounded-xl border border-gray-200 bg-white p-4"
>
  <Text className="font-medium text-gray-900">Đổi mật khẩu</Text>
</TouchableOpacity>
```

- [ ] **Step 3: Type-check**
```bash
cd f2t-frontend
pnpm type-check 2>&1 | tail -10
```
Expected: No errors.

- [ ] **Step 4: Commit**
```bash
cd f2t-frontend
git add src/app/\(app\)/profile/change-password.tsx \
        src/app/\(app\)/profile/edit.tsx
git commit -m "feat(auth): change-password screen in profile"
```

---

## GROUP B — Reviews & Ratings

### Task 6: Backend — Review schema + DTOs

**Files:**
- Create: `f2t-backend/src/modules/reviews/schemas/review.schema.ts`
- Create: `f2t-backend/src/modules/reviews/dto/create-review.dto.ts`
- Create: `f2t-backend/src/modules/reviews/dto/get-reviews-query.dto.ts`

- [ ] **Step 1: Create Review schema**

`f2t-backend/src/modules/reviews/schemas/review.schema.ts`:
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, unknown>) => {
      ret.id = (ret._id as { toString(): string }).toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true })
  customerName!: string;

  @Prop()
  customerAvatarUrl?: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ required: true, maxlength: 500 })
  comment!: string;

  @Prop({ type: [String], default: [] })
  photos!: string[];
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });
ReviewSchema.index({ productId: 1 });
ReviewSchema.index({ customerId: 1 });
```

- [ ] **Step 2: Create DTOs**

`f2t-backend/src/modules/reviews/dto/create-review.dto.ts`:
```typescript
import { IsArray, IsInt, IsMongoId, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty()
  @IsMongoId()
  productId!: string;

  @ApiProperty()
  @IsMongoId()
  orderId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  comment!: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photos?: string[];
}
```

`f2t-backend/src/modules/reviews/dto/get-reviews-query.dto.ts`:
```typescript
import { IsMongoId, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetReviewsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
```

- [ ] **Step 3: Commit**
```bash
cd f2t-backend
git add src/modules/reviews/schemas/review.schema.ts \
        src/modules/reviews/dto/create-review.dto.ts \
        src/modules/reviews/dto/get-reviews-query.dto.ts
git commit -m "feat(reviews): Review schema + DTOs"
```

---

### Task 7: Backend — Reviews service, controller, module

**Files:**
- Create: `f2t-backend/src/modules/reviews/reviews.service.ts`
- Create: `f2t-backend/src/modules/reviews/reviews.controller.ts`
- Create: `f2t-backend/src/modules/reviews/reviews.module.ts`
- Create: `f2t-backend/src/modules/reviews/reviews.service.spec.ts`
- Modify: `f2t-backend/src/app.module.ts`

- [ ] **Step 1: Write failing tests**

`f2t-backend/src/modules/reviews/reviews.service.spec.ts`:
```typescript
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { Review } from './schemas/review.schema';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';

const mockReviewModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  deleteOne: jest.fn(),
};

const mockOrderModel = {
  findOne: jest.fn(),
};

const mockProductModel = {
  updateOne: jest.fn(),
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();
    service = module.get(ReviewsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ForbiddenException when no delivered order found', async () => {
      mockOrderModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(
        service.create('uid1', 'cname', undefined, { productId: 'pid1', orderId: 'oid1', rating: 5, comment: 'great' }),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated reviews', async () => {
      mockReviewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      });
      mockReviewModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10, hasMore: false });
    });
  });
});
```

- [ ] **Step 2: Run to confirm failure**
```bash
cd f2t-backend
npx jest src/modules/reviews/reviews.service.spec.ts --no-coverage 2>&1 | tail -15
```
Expected: FAIL — ReviewsService not found.

- [ ] **Step 3: Create ReviewsService**

`f2t-backend/src/modules/reviews/reviews.service.ts`:
```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private usersService: UsersService,
  ) {}

  async create(
    customerId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewDocument> {
    const user = await this.usersService.findById(customerId);
    const customerName = user
      ? `${user.firstName} ${user.lastName}`.trim()
      : 'Người dùng';
    const customerAvatarUrl = user?.avatarUrl;
    const deliveredOrder = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(dto.orderId),
        customerId: new Types.ObjectId(customerId),
        status: 'delivered',
        'items.productId': new Types.ObjectId(dto.productId),
      })
      .exec();

    if (!deliveredOrder) {
      throw new ForbiddenException(
        'Chỉ có thể đánh giá sản phẩm trong đơn hàng đã giao thành công.',
      );
    }

    const review = await this.reviewModel.create({
      productId: new Types.ObjectId(dto.productId),
      orderId: new Types.ObjectId(dto.orderId),
      customerId: new Types.ObjectId(customerId),
      customerName,
      customerAvatarUrl,
      rating: dto.rating,
      comment: dto.comment,
      photos: dto.photos ?? [],
    });

    await this.updateProductRating(dto.productId);
    return review;
  }

  async findAll(query: GetReviewsQueryDto) {
    const { page = 1, limit = 10, productId } = query;
    const filter: Record<string, unknown> = {};
    if (productId) filter.productId = new Types.ObjectId(productId);

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async findMine(customerId: string, query: GetReviewsQueryDto) {
    return this.findAll({ ...query, productId: undefined });
    // override filter inline
    const { page = 1, limit = 10 } = query;
    const filter = { customerId: new Types.ObjectId(customerId) };
    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async remove(id: string, requesterId: string, isAdmin: boolean): Promise<void> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.customerId.toHexString() !== requesterId) {
      throw new ForbiddenException();
    }
    await this.reviewModel.deleteOne({ _id: id }).exec();
    await this.updateProductRating(review.productId.toHexString());
  }

  private async updateProductRating(productId: string): Promise<void> {
    const result = await this.reviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avg = result[0]?.avg ?? 0;
    const count = result[0]?.count ?? 0;
    await this.productModel
      .updateOne(
        { _id: new Types.ObjectId(productId) },
        { averageRating: Math.round(avg * 10) / 10, reviewCount: count },
      )
      .exec();
  }
}
```

- [ ] **Step 4: Fix findMine (dead code)**

The `findMine` method above has unreachable code after the first return. Replace with the correct implementation:
```typescript
async findMine(customerId: string, query: GetReviewsQueryDto) {
  const { page = 1, limit = 10 } = query;
  const filter = { customerId: new Types.ObjectId(customerId) };
  const [items, total] = await Promise.all([
    this.reviewModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    this.reviewModel.countDocuments(filter).exec(),
  ]);
  return { items, total, page, limit, hasMore: page * limit < total };
}
```

- [ ] **Step 5: Create ReviewsController**

`f2t-backend/src/modules/reviews/reviews.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get reviews (filter by productId)' })
  findAll(@Query() query: GetReviewsQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my reviews' })
  findMine(@CurrentUser() user: RequestUser, @Query() query: GetReviewsQueryDto) {
    return this.reviewsService.findMine(user.userId, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review (must have delivered order)' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review (owner or admin)' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reviewsService.remove(id, user.userId, user.role === 'admin');
  }
}
```

- [ ] **Step 6: Create ReviewsModule**

`f2t-backend/src/modules/reviews/reviews.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review, ReviewSchema } from './schemas/review.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
```

- [ ] **Step 7: Register in AppModule**

In `f2t-backend/src/app.module.ts`, add:
```typescript
import { ReviewsModule } from './modules/reviews/reviews.module';
// Add ReviewsModule to the imports array
```

- [ ] **Step 8: Add averageRating + reviewCount to Product schema**

In `f2t-backend/src/modules/products/schemas/product.schema.ts`, inside the `Product` class add:
```typescript
@Prop({ default: 0 })
averageRating!: number;

@Prop({ default: 0 })
reviewCount!: number;
```

- [ ] **Step 9: Run tests**
```bash
cd f2t-backend
npx jest src/modules/reviews/reviews.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: All tests pass.

- [ ] **Step 10: Build + lint**
```bash
cd f2t-backend
npm run build 2>&1 | tail -10 && npm run lint 2>&1 | tail -10
```
Expected: No errors.

- [ ] **Step 11: Commit**
```bash
cd f2t-backend
git add src/modules/reviews/ \
        src/modules/products/schemas/product.schema.ts \
        src/app.module.ts
git commit -m "feat(reviews): Reviews module — schema, service, controller, module + product rating fields"
```

---

### Task 8: Frontend — Reviews API hooks + types

**Files:**
- Create: `f2t-frontend/src/api/reviews/types.ts`
- Create: `f2t-frontend/src/api/reviews/use-get-reviews.tsx`
- Create: `f2t-frontend/src/api/reviews/use-add-review.tsx`
- Create: `f2t-frontend/src/api/reviews/use-delete-review.tsx`
- Create: `f2t-frontend/src/api/reviews/use-my-reviews.tsx`
- Create: `f2t-frontend/src/api/reviews/index.ts`

- [ ] **Step 1: Create types**

`f2t-frontend/src/api/reviews/types.ts`:
```typescript
export type Review = {
  id: string;
  productId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl?: string;
  rating: number;
  comment: string;
  photos: string[];
  createdAt: string;
};

export type CreateReviewRequest = {
  productId: string;
  orderId: string;
  rating: number;
  comment: string;
  photos?: string[];
};

export type ReviewsResponse = {
  success: boolean;
  data: {
    items: Review[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};
```

- [ ] **Step 2: Create hooks**

`f2t-frontend/src/api/reviews/use-get-reviews.tsx`:
```typescript
import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';
import { client } from '../common/client';
import type { ReviewsResponse } from './types';

type Variables = { productId: string; page?: number; limit?: number };

export const useGetReviews = createQuery<ReviewsResponse, Variables, AxiosError>({
  queryKey: ['reviews'],
  fetcher: (variables) =>
    client({
      url: 'reviews',
      method: 'GET',
      params: variables,
    }).then((r) => r.data),
});
```

`f2t-frontend/src/api/reviews/use-my-reviews.tsx`:
```typescript
import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';
import { client } from '../common/client';
import type { ReviewsResponse } from './types';

export const useMyReviews = createQuery<ReviewsResponse, { page?: number; limit?: number }, AxiosError>({
  queryKey: ['my-reviews'],
  fetcher: (variables) =>
    client({ url: 'reviews/my', method: 'GET', params: variables }).then((r) => r.data),
});
```

`f2t-frontend/src/api/reviews/use-add-review.tsx`:
```typescript
import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';
import { client } from '../common/client';
import type { CreateReviewRequest, Review } from './types';

export const useAddReview = createMutation<{ success: boolean; data: Review }, CreateReviewRequest, AxiosError>({
  mutationFn: (variables) =>
    client({ url: 'reviews', method: 'POST', data: variables }).then((r) => r.data),
});
```

`f2t-frontend/src/api/reviews/use-delete-review.tsx`:
```typescript
import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';
import { client } from '../common/client';

export const useDeleteReview = createMutation<void, { id: string }, AxiosError>({
  mutationFn: ({ id }) =>
    client({ url: `reviews/${id}`, method: 'DELETE' }).then((r) => r.data),
});
```

`f2t-frontend/src/api/reviews/index.ts`:
```typescript
export * from './types';
export * from './use-get-reviews';
export * from './use-add-review';
export * from './use-delete-review';
export * from './use-my-reviews';
```

- [ ] **Step 3: Type-check**
```bash
cd f2t-frontend
pnpm type-check 2>&1 | tail -10
```
Expected: No errors.

- [ ] **Step 4: Commit**
```bash
cd f2t-frontend
git add src/api/reviews/
git commit -m "feat(reviews): reviews API hooks + types"
```

---

### Task 9: Frontend — Reviews UI on product detail + add-review screen

**Files:**
- Create: `f2t-frontend/src/app/products/add-review.tsx`
- Modify: `f2t-frontend/src/app/products/[id].tsx`

- [ ] **Step 1: Create add-review screen**

`f2t-frontend/src/app/products/add-review.tsx`:
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Image, ScrollView, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as z from 'zod';

import { useAddReview } from '@/api/reviews';
import { useUploadMedia } from '@/api/uploads';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, 'Vui lòng nhập nhận xét').max(500),
  photos: z.array(z.string()).max(3),
});
type FormType = z.infer<typeof schema>;

export default function AddReview() {
  const router = useRouter();
  const { productId, orderId } = useLocalSearchParams<{ productId: string; orderId: string }>();
  const { mutate, isPending } = useAddReview();
  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia();
  const { handleSubmit, control, setValue, watch } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0, comment: '', photos: [] },
  });

  const photos = watch('photos');
  const rating = watch('rating');

  const pickPhoto = async () => {
    if (photos.length >= 3) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uploaded = await uploadMedia({
        file: { uri: result.assets[0].uri },
        type: 'image',
      });
      setValue('photos', [...photos, uploaded.url]);
    }
  };

  const onSubmit = (data: FormType) => {
    mutate(
      { productId: productId ?? '', orderId: orderId ?? '', ...data },
      {
        onSuccess: () => {
          Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận.');
          router.back();
        },
        onError: () => {
          Alert.alert('Lỗi', 'Không thể gửi đánh giá. Vui lòng thử lại.');
        },
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-2xl font-bold text-gray-900">Viết đánh giá</Text>

      {/* Star rating */}
      <Text className="mb-2 font-medium text-gray-700">Số sao *</Text>
      <View className="mb-4 flex-row gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setValue('rating', star)}>
            <Text className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ControlledInput
        control={control}
        name="comment"
        label="Nhận xét *"
        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
        multiline
        numberOfLines={4}
      />

      {/* Photo picker */}
      <Text className="mb-2 mt-4 font-medium text-gray-700">Ảnh (tối đa 3)</Text>
      <View className="mb-4 flex-row gap-2">
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} className="h-20 w-20 rounded-lg" />
        ))}
        {photos.length < 3 && (
          <TouchableOpacity
            onPress={pickPhoto}
            disabled={isUploading}
            className="h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white"
          >
            <Text className="text-2xl text-gray-400">+</Text>
          </TouchableOpacity>
        )}
      </View>

      <Button
        label={isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending || isUploading || rating === 0}
        className="mt-2"
      />
    </ScrollView>
  );
}
```

- [ ] **Step 2: Add reviews section to product detail**

In `f2t-frontend/src/app/products/[id].tsx`, read the file first, then add after the existing product detail content:

```typescript
// Add these imports at the top:
import { useGetReviews } from '@/api/reviews';
import { useGetOrders } from '@/api/orders';
import { useAuthStore } from '@/lib/auth/store';
import { useRouter } from 'expo-router';

// Inside the component, add these hooks:
const router = useRouter();
const { data: user } = useAuthStore((s) => ({ data: s.user }));
const productId = String(id); // where id comes from params

const { data: reviewsRes } = useGetReviews({ variables: { productId, limit: 5 } });
const { data: ordersRes } = useGetOrders({
  variables: { status: 'delivered' },
  enabled: !!user,
});

const canReview = React.useMemo(() => {
  if (!user || user.role !== 'consumer') return null;
  return ordersRes?.data?.items?.find((o: any) =>
    o.items?.some((item: any) => item.productId === productId),
  ) ?? null;
}, [ordersRes, user, productId]);

// Add this JSX section at the bottom of the ScrollView:
```
```tsx
{/* Reviews Section */}
<View className="mt-6 px-4">
  <View className="mb-3 flex-row items-center justify-between">
    <Text className="text-lg font-bold text-gray-900">
      Đánh giá ({product.reviewCount ?? 0})
    </Text>
    {product.averageRating > 0 && (
      <Text className="text-yellow-500 font-bold">
        ★ {product.averageRating.toFixed(1)}
      </Text>
    )}
  </View>

  {canReview && (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: '/products/add-review',
          params: { productId, orderId: canReview.id },
        })
      }
      className="mb-4 rounded-xl bg-green-600 py-3"
    >
      <Text className="text-center font-bold text-white">Viết đánh giá</Text>
    </TouchableOpacity>
  )}

  {reviewsRes?.data?.items?.map((review: any) => (
    <View key={review.id} className="mb-3 rounded-xl bg-white p-4 shadow-sm">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="font-medium text-gray-900">{review.customerName}</Text>
        <Text className="text-yellow-500">{'★'.repeat(review.rating)}</Text>
      </View>
      <Text className="text-gray-600">{review.comment}</Text>
      {review.photos?.length > 0 && (
        <View className="mt-2 flex-row gap-2">
          {review.photos.map((p: string, i: number) => (
            <Image key={i} source={{ uri: p }} className="h-16 w-16 rounded-lg" />
          ))}
        </View>
      )}
    </View>
  ))}
</View>
```

- [ ] **Step 3: Type-check**
```bash
cd f2t-frontend
pnpm type-check 2>&1 | tail -10
```
Expected: No errors (or fix any type issues by adding `as any` for now).

- [ ] **Step 4: Commit**
```bash
cd f2t-frontend
git add src/app/products/add-review.tsx src/app/products/\[id\].tsx
git commit -m "feat(reviews): add-review screen + reviews section on product detail"
```

---

## GROUP C — Admin Enhancements

### Task 10: Backend — Admin posts endpoints

**Files:**
- Modify: `f2t-backend/src/modules/admin/admin.module.ts`
- Modify: `f2t-backend/src/modules/admin/admin.service.ts`
- Modify: `f2t-backend/src/modules/admin/admin.controller.ts`
- Modify: `f2t-backend/src/modules/admin/dto/admin.dto.ts`

- [ ] **Step 1: Add AdminPostsQueryDto**

In `f2t-backend/src/modules/admin/dto/admin.dto.ts`, add:
```typescript
export class AdminPostsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
```

- [ ] **Step 2: Import PostSchema in AdminModule**

In `f2t-backend/src/modules/admin/admin.module.ts`:
```typescript
import { Post, PostSchema } from '../posts/schemas/post.schema';

// Inside MongooseModule.forFeature([...]) array, add:
{ name: Post.name, schema: PostSchema },
```

- [ ] **Step 3: Add service methods**

In `f2t-backend/src/modules/admin/admin.service.ts`, add injection and methods:
```typescript
// Add to constructor:
@InjectModel(Post.name) private postModel: Model<PostDocument>,

// Add imports:
import { Post, PostDocument } from '../posts/schemas/post.schema';

// Add methods:
async findAllPosts(query: AdminPostsQueryDto) {
  const { page = 1, limit = 20, search } = query;
  const filter: Record<string, unknown> = {};
  if (search) filter.$text = { $search: search };

  const [items, total] = await Promise.all([
    this.postModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    this.postModel.countDocuments(filter).exec(),
  ]);
  return { items, total, page, limit, hasMore: page * limit < total };
}

async deletePost(id: string): Promise<void> {
  await this.postModel.deleteOne({ _id: id }).exec();
}
```

- [ ] **Step 4: Add controller endpoints**

In `f2t-backend/src/modules/admin/admin.controller.ts`:
```typescript
import { AdminPostsQueryDto } from './dto/admin.dto';

// Add endpoints:
@Get('posts')
findAllPosts(@Query() query: AdminPostsQueryDto) {
  return this.adminService.findAllPosts(query);
}

@Delete('posts/:id')
@HttpCode(HttpStatus.NO_CONTENT)
deletePost(@Param('id') id: string): Promise<void> {
  return this.adminService.deletePost(id);
}
```

Add missing imports to the controller: `Delete, HttpCode, HttpStatus` from `@nestjs/common`.

- [ ] **Step 5: Build + lint**
```bash
cd f2t-backend
npm run build 2>&1 | tail -10 && npm run lint 2>&1 | tail -10
```
Expected: No errors.

- [ ] **Step 6: Commit**
```bash
cd f2t-backend
git add src/modules/admin/
git commit -m "feat(admin): GET/DELETE /admin/posts endpoints"
```

---

### Task 11: Frontend — New admin screens (Posts, Products, Reviews)

**Files:**
- Create: `f2t-frontend/src/app/admin/posts.tsx`
- Create: `f2t-frontend/src/app/admin/products.tsx`
- Create: `f2t-frontend/src/app/admin/reviews.tsx`
- Modify: `f2t-frontend/src/app/admin/index.tsx`

- [ ] **Step 1: Create admin/posts.tsx**

`f2t-frontend/src/app/admin/posts.tsx`:
```typescript
import React from 'react';
import { ActivityIndicator, Alert, FlatList, TouchableOpacity, View } from 'react-native';
import { client } from '@/api/common/client';
import { Text } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: () =>
      client({ url: 'admin/posts', method: 'GET', params: { limit: 50 } }).then(
        (r) => r.data.data,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client({ url: `admin/posts/${id}`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-posts'] }),
  });

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Xóa bài đăng', `Xóa "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  if (isLoading) return <ActivityIndicator className="flex-1" />;

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16 }}
      data={data?.items ?? []}
      keyExtractor={(item: any) => item.id}
      renderItem={({ item }: any) => (
        <View className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm">
          <View className="flex-1 pr-2">
            <Text className="font-medium text-gray-900" numberOfLines={1}>{item.title}</Text>
            <Text className="text-sm text-gray-500">{item.authorRole} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
          </View>
          <TouchableOpacity onPress={() => confirmDelete(item.id, item.title)}>
            <Text className="font-bold text-red-500">Xóa</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}
```

- [ ] **Step 2: Create admin/products.tsx**

`f2t-frontend/src/app/admin/products.tsx`:
```typescript
import React from 'react';
import { ActivityIndicator, Alert, FlatList, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/common/client';
import { Text } from '@/components/ui';

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: () =>
      client({ url: 'admin/products', method: 'GET', params: { limit: 50, search: search || undefined } }).then(
        (r) => r.data.data,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client({ url: `products/${id}`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Xóa sản phẩm', `Xóa "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3"
          placeholder="Tìm sản phẩm..."
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16 }}
          data={data?.items ?? []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => (
            <View className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm">
              <View className="flex-1 pr-2">
                <Text className="font-medium text-gray-900" numberOfLines={1}>{item.name}</Text>
                <Text className="text-sm text-gray-500">{item.category} · {item.pricePerUnit?.toLocaleString('vi-VN')}đ/{item.unit}</Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)}>
                <Text className="font-bold text-red-500">Xóa</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create admin/reviews.tsx**

`f2t-frontend/src/app/admin/reviews.tsx`:
```typescript
import React from 'react';
import { ActivityIndicator, Alert, FlatList, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/common/client';
import { Text } from '@/components/ui';

export default function AdminReviews() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () =>
      client({ url: 'reviews', method: 'GET', params: { limit: 50 } }).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client({ url: `reviews/${id}`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const confirmDelete = (id: string) => {
    Alert.alert('Xóa đánh giá', 'Bạn chắc chắn muốn xóa đánh giá này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  if (isLoading) return <ActivityIndicator className="flex-1" />;

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16 }}
      data={data?.items ?? []}
      keyExtractor={(item: any) => item.id}
      renderItem={({ item }: any) => (
        <View className="mb-3 rounded-xl bg-white p-4 shadow-sm">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-medium">{item.customerName}</Text>
            <Text className="text-yellow-500">{'★'.repeat(item.rating)}</Text>
          </View>
          <Text className="mb-2 text-gray-600" numberOfLines={2}>{item.comment}</Text>
          <TouchableOpacity onPress={() => confirmDelete(item.id)} className="self-end">
            <Text className="text-sm font-bold text-red-500">Xóa</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}
```

- [ ] **Step 4: Add nav buttons to admin dashboard**

In `f2t-frontend/src/app/admin/index.tsx`, in the navigation buttons section, add 3 new buttons after the existing 3:
```typescript
<TouchableOpacity
  className="mb-4 w-[31%] rounded-xl bg-purple-600 py-3"
  onPress={() => router.push('/admin/products')}
>
  <Text className="text-center font-bold text-white">Products</Text>
</TouchableOpacity>
<TouchableOpacity
  className="mb-4 w-[31%] rounded-xl bg-purple-600 py-3"
  onPress={() => router.push('/admin/posts')}
>
  <Text className="text-center font-bold text-white">Posts</Text>
</TouchableOpacity>
<TouchableOpacity
  className="mb-4 w-[31%] rounded-xl bg-purple-600 py-3"
  onPress={() => router.push('/admin/reviews')}
>
  <Text className="text-center font-bold text-white">Reviews</Text>
</TouchableOpacity>
```

- [ ] **Step 5: Type-check**
```bash
cd f2t-frontend
pnpm type-check 2>&1 | tail -10
```

- [ ] **Step 6: Commit**
```bash
cd f2t-frontend
git add src/app/admin/posts.tsx src/app/admin/products.tsx \
        src/app/admin/reviews.tsx src/app/admin/index.tsx
git commit -m "feat(admin): new screens — Posts, Products, Reviews + dashboard nav"
```

---

### Task 12: Frontend — Enhance existing admin screens

**Files:**
- Modify: `f2t-frontend/src/app/admin/users.tsx`
- Modify: `f2t-frontend/src/app/admin/farms.tsx`
- Modify: `f2t-frontend/src/app/admin/orders.tsx`

- [ ] **Step 1: Read current users.tsx, farms.tsx, orders.tsx**

Read each file in full before editing to understand the current implementation.

- [ ] **Step 2: Enhance users.tsx**

Add a search input at the top and role filter chips. The `GET /api/admin/users` already accepts `search` and `role` params. Pattern:
```typescript
// Add state:
const [search, setSearch] = React.useState('');
const [roleFilter, setRoleFilter] = React.useState<string | undefined>(undefined);

// Pass to query:
params: { page: 1, limit: 50, search: search || undefined, role: roleFilter }

// Add JSX before the list:
<TextInput
  className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
  placeholder="Tìm theo tên hoặc email..."
  value={search}
  onChangeText={setSearch}
/>
<View className="mb-3 flex-row gap-2">
  {['all', 'consumer', 'farm', 'admin'].map((r) => (
    <TouchableOpacity
      key={r}
      onPress={() => setRoleFilter(r === 'all' ? undefined : r)}
      className={`rounded-full px-3 py-1 ${
        (r === 'all' && !roleFilter) || roleFilter === r
          ? 'bg-blue-600'
          : 'bg-gray-200'
      }`}
    >
      <Text className={`text-sm font-medium ${
        (r === 'all' && !roleFilter) || roleFilter === r ? 'text-white' : 'text-gray-700'
      }`}>{r}</Text>
    </TouchableOpacity>
  ))}
</View>
```

- [ ] **Step 3: Enhance farms.tsx**

Add verificationStatus filter chips (pending / verified / rejected). `GET /api/admin/farms` accepts `verificationStatus` param.
```typescript
const [statusFilter, setStatusFilter] = React.useState<string | undefined>(undefined);
// Pass: params: { limit: 50, verificationStatus: statusFilter }
// Add filter chips: ['all', 'pending', 'verified', 'rejected']
```

- [ ] **Step 4: Enhance orders.tsx**

Add paymentStatus filter. `GET /api/admin/orders` accepts `paymentStatus` param.
```typescript
const [paymentFilter, setPaymentFilter] = React.useState<string | undefined>(undefined);
// Pass: params: { limit: 50, paymentStatus: paymentFilter }
// Add filter chips: ['all', 'pending', 'paid', 'failed', 'refunded']
```

- [ ] **Step 5: Type-check**
```bash
cd f2t-frontend
pnpm type-check 2>&1 | tail -10
```

- [ ] **Step 6: Commit**
```bash
cd f2t-frontend
git add src/app/admin/users.tsx src/app/admin/farms.tsx src/app/admin/orders.tsx
git commit -m "feat(admin): search/filter on users, farms, orders screens"
```

---

## GROUP D — Post Tagging Fix

### Task 13: Backend — GET /users/search endpoint

**Files:**
- Modify: `f2t-backend/src/modules/users/users.service.ts`
- Modify: `f2t-backend/src/modules/users/users.controller.ts`

- [ ] **Step 1: Add searchUsers to UsersService**

In `f2t-backend/src/modules/users/users.service.ts`, add:
```typescript
async searchUsers(q: string): Promise<{ id: string; name: string; avatarUrl?: string }[]> {
  if (!q || q.trim().length < 2) return [];
  const users = await this.userModel
    .find({
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
      ],
      isBanned: { $ne: true },
    })
    .limit(10)
    .exec();

  return users.map((u) => ({
    id: u._id.toHexString(),
    name: `${u.firstName} ${u.lastName}`.trim(),
    avatarUrl: u.avatarUrl,
  }));
}
```

- [ ] **Step 2: Add controller endpoint**

In `f2t-backend/src/modules/users/users.controller.ts`, add:
```typescript
@Get('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Search users by name (for tagging)' })
searchUsers(@Query('q') q: string) {
  return this.usersService.searchUsers(q ?? '');
}
```

**Important:** This `@Get('search')` route must be placed BEFORE `@Get(':id')` in the controller, otherwise Express will match `search` as an `:id` param.

- [ ] **Step 3: Build + lint**
```bash
cd f2t-backend
npm run build 2>&1 | tail -10 && npm run lint 2>&1 | tail -10
```
Expected: No errors.

- [ ] **Step 4: Commit**
```bash
cd f2t-backend
git add src/modules/users/users.service.ts src/modules/users/users.controller.ts
git commit -m "feat(users): GET /users/search?q= endpoint for post tagging"
```

---

### Task 14: Frontend — Post tagging UI fix

**Files:**
- Create: `f2t-frontend/src/api/users/use-search-users.tsx`
- Modify: `f2t-frontend/src/api/users/index.ts` (or wherever users API is exported)
- Modify: `f2t-frontend/src/app/feed/add-post.tsx`

- [ ] **Step 1: Create use-search-users hook**

`f2t-frontend/src/api/users/use-search-users.tsx`:
```typescript
import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';
import { client } from '../common/client';

export type UserSearchResult = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export const useSearchUsers = createQuery<
  { success: boolean; data: UserSearchResult[] },
  { q: string },
  AxiosError
>({
  queryKey: ['users-search'],
  fetcher: ({ q }) =>
    client({ url: 'users/search', method: 'GET', params: { q } }).then((r) => r.data),
});
```

- [ ] **Step 2: Create users API index and export globally**

`f2t-frontend/src/api/users/index.ts` (new file):
```typescript
export * from './use-search-users';
```

In `f2t-frontend/src/api/index.tsx`, add at the end:
```typescript
export * from './users';
```

- [ ] **Step 3: Read add-post.tsx in full**

Read `f2t-frontend/src/app/feed/add-post.tsx` completely before editing.

- [ ] **Step 4: Add tag picker to add-post.tsx**

After the existing imports, add:
```typescript
import { Modal, TextInput } from 'react-native';
import { useSearchUsers } from '@/api/users';
import { useGetFarms } from '@/api/farms';
```

Add state variables inside the component:
```typescript
const [showTagPicker, setShowTagPicker] = React.useState(false);
const [tagTab, setTagTab] = React.useState<'user' | 'farm'>('user');
const [tagSearch, setTagSearch] = React.useState('');
const [farmSearchResults, setFarmSearchResults] = React.useState<{ id: string; name: string }[]>([]);
```

Add user search query (farms use a manual search to avoid InfiniteQuery complexity):
```typescript
const { data: userResults } = useSearchUsers({
  variables: { q: tagSearch },
  enabled: tagTab === 'user' && tagSearch.length >= 2,
});

React.useEffect(() => {
  if (tagTab !== 'farm' || tagSearch.length < 2) {
    setFarmSearchResults([]);
    return;
  }
  client({ url: 'farms', method: 'GET', params: { search: tagSearch, limit: 10 } })
    .then((r) => setFarmSearchResults(r.data?.data?.items ?? []))
    .catch(() => setFarmSearchResults([]));
}, [tagSearch, tagTab]);
```

Add `client` import at the top of the file:
```typescript
import { client } from '@/api/common/client';
```

Add tag picker modal JSX before the closing `</ScrollView>`:
```tsx
{/* Tag chips display */}
{tags.length > 0 && (
  <View className="mb-3 flex-row flex-wrap gap-2">
    {tags.map((tag) => (
      <TouchableOpacity
        key={tag.id}
        onPress={() => setValue('tags', tags.filter((t) => t.id !== tag.id))}
        className="flex-row items-center rounded-full bg-blue-100 px-3 py-1"
      >
        <Text className="mr-1 text-sm text-blue-700">@{tag.name}</Text>
        <Text className="text-sm text-blue-500">×</Text>
      </TouchableOpacity>
    ))}
  </View>
)}

{/* Tag button */}
{tags.length < 5 && (
  <TouchableOpacity
    onPress={() => setShowTagPicker(true)}
    className="mb-4 rounded-xl border border-dashed border-gray-300 py-3"
  >
    <Text className="text-center text-gray-500">+ Tag người / farm</Text>
  </TouchableOpacity>
)}

{/* Tag picker modal */}
<Modal visible={showTagPicker} animationType="slide" presentationStyle="pageSheet">
  <View className="flex-1 bg-white p-4">
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="text-lg font-bold">Chọn tag</Text>
      <TouchableOpacity onPress={() => { setShowTagPicker(false); setTagSearch(''); }}>
        <Text className="text-blue-600">Xong</Text>
      </TouchableOpacity>
    </View>

    {/* Tabs */}
    <View className="mb-3 flex-row gap-2">
      {(['user', 'farm'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => { setTagTab(tab); setTagSearch(''); }}
          className={`rounded-full px-4 py-2 ${tagTab === tab ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <Text className={tagTab === tab ? 'text-white font-medium' : 'text-gray-700'}>
            {tab === 'user' ? 'Người dùng' : 'Farm'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <TextInput
      className="mb-3 rounded-xl border border-gray-200 px-4 py-3"
      placeholder={`Tìm ${tagTab === 'user' ? 'người dùng' : 'farm'}...`}
      value={tagSearch}
      onChangeText={setTagSearch}
      autoFocus
    />

    <FlatList
      data={
        tagTab === 'user'
          ? (userResults?.data ?? []).map((u) => ({ id: u.id, name: u.name, type: 'consumer' as const }))
          : farmSearchResults.map((f) => ({ id: f.id, name: f.name, type: 'farm' as const }))
      }
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const alreadyTagged = tags.some((t) => t.id === item.id);
        return (
          <TouchableOpacity
            onPress={() => {
              if (!alreadyTagged) {
                setValue('tags', [...tags, { id: item.id, type: item.type, name: item.name }]);
              }
            }}
            className={`mb-2 flex-row items-center justify-between rounded-xl px-4 py-3 ${
              alreadyTagged ? 'bg-blue-50' : 'bg-gray-50'
            }`}
          >
            <Text className="font-medium text-gray-900">@{item.name}</Text>
            {alreadyTagged && <Text className="text-blue-600">✓</Text>}
          </TouchableOpacity>
        );
      }}
    />
  </View>
</Modal>
```

Add `FlatList` to imports from `react-native`.

- [ ] **Step 5: Type-check**
```bash
cd f2t-frontend
pnpm type-check 2>&1 | tail -10
```
Expected: No errors.

- [ ] **Step 6: Lint**
```bash
cd f2t-frontend
pnpm lint 2>&1 | tail -10
```

- [ ] **Step 7: Commit**
```bash
cd f2t-frontend
git add src/api/users/use-search-users.tsx src/api/users/index.ts \
        src/app/feed/add-post.tsx
git commit -m "fix(posts): tag picker UI — search users/farms and add tags to post"
```

---

## Final Verification

- [ ] **Backend: run all tests**
```bash
cd f2t-backend
npm test 2>&1 | tail -30
```
Expected: All existing tests pass + new tests pass.

- [ ] **Frontend: type-check + lint**
```bash
cd f2t-frontend
pnpm check-all 2>&1 | tail -30
```
Expected: No errors.

- [ ] **Final commit**
```bash
git add -A
git commit -m "chore: final lint/type fixes after auth+reviews+admin+tagging implementation"
```
