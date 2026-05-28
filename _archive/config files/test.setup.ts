// test/setup.ts
// Global test setup for NestJS unit tests.
// Import this via jest.config.ts setupFilesAfterFramework if needed.

import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

// ── Standard mock factory for Mongoose models ────────────────────────────────
// Usage: providers: [mockModel(User.name)]
export function mockModel(modelName: string) {
  return {
    provide: getModelToken(modelName),
    useValue: {
      new: jest.fn(),
      constructor: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      }),
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findByIdAndDelete: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      aggregate: jest.fn().mockResolvedValue([]),
      // Allows: new this.model({...}).save()
      mockImplementation: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue({}),
      }),
    },
  };
}

// ── Standard mock factory for NestJS services ────────────────────────────────
// Usage: providers: [mockService(UsersService)]
export function mockService<T>(
  service: new (...args: never[]) => T,
): { provide: new (...args: never[]) => T; useValue: jest.Mocked<T> } {
  const methods = Object.getOwnPropertyNames(service.prototype).filter(
    m => m !== 'constructor',
  );
  const mock = methods.reduce<Record<string, jest.Mock>>((acc, method) => {
    acc[method] = jest.fn();
    return acc;
  }, {});
  return { provide: service, useValue: mock as jest.Mocked<T> };
}

// ── Standard ConfigService mock ──────────────────────────────────────────────
export const mockConfigService = {
  provide: 'ConfigService',
  useValue: {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-jwt-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        PORT: '3000',
      };
      return config[key] ?? null;
    }),
  },
};

// ── Global test helpers ──────────────────────────────────────────────────────

// Build a NestJS testing module with standard pipes
export async function buildTestingModule(
  metadata: Parameters<typeof Test.createTestingModule>[0],
): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule(metadata).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      enableImplicitConversion: true,
    }),
  );
  await app.init();
  return moduleRef;
}

// Generate a mock ObjectId string
export function mockObjectId(): string {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

// Mock JWT user payload
export function mockJwtUser(overrides?: Partial<{
  userId: string;
  email: string;
  role: string;
}>): { userId: string; email: string; role: string } {
  return {
    userId: mockObjectId(),
    email: 'test@example.com',
    role: 'consumer',
    ...overrides,
  };
}
