// test/e2e.setup.ts
// Shared setup for all e2e test files.
// Provides: in-memory MongoDB, NestJS app instance, HTTP agent.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

let app: INestApplication | undefined;
let mongod: MongoMemoryServer | undefined;
let moduleRef: TestingModule | undefined;

// ── Lifecycle ────────────────────────────────────────────────────────────────

export async function setupE2E(): Promise<{
  app: INestApplication;
  httpServer: unknown;
}> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(MongooseModule)
    .useModule(MongooseModule.forRoot(uri))
    .compile();

  app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      enableImplicitConversion: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.init();
  return { app, httpServer: app.getHttpServer() };
}

export async function teardownE2E(): Promise<void> {
  await app?.close();
  await mongod?.stop();
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

export async function registerAndLogin(
  httpServer: unknown,
  overrides?: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }>,
): Promise<{ accessToken: string; userId: string }> {
  const user = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'consumer',
    ...overrides,
  };

  await request(httpServer).post('/api/auth/register').send(user);

  const loginRes = await request(httpServer).post('/api/auth/login').send({
    email: user.email,
    password: user.password,
  });

  const data = loginRes.body.data as {
    accessToken: string;
    user: { id: string };
  };

  return {
    accessToken: data.accessToken,
    userId: data.user.id,
  };
}

// Authenticated request shorthand
export function authedRequest(
  httpServer: unknown,
  token: string,
): ReturnType<typeof request> {
  return request(httpServer).set('Authorization', `Bearer ${token}`);
}
