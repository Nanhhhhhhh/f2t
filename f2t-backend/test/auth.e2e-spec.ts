import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

interface MeResponse {
  success: boolean;
  data: {
    email: string;
  };
}

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.MONGODB_URI = uri;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
              JWT_EXPIRATION: '1h',
              JWT_REFRESH_EXPIRATION: '7d',
              MONGODB_URI: uri,
            }),
          ],
        }),
        MongooseModule.forRoot(uri),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  const registerDto = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '0901234567',
    role: 'consumer',
  };

  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer() as string)
      .post('/auth/register')
      .send(registerDto)
      .expect(201)
      .expect((res: { body: AuthResponse }) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(registerDto.email);
        expect(res.body.data.accessToken).toBeDefined();
        accessToken = res.body.data.accessToken;
        refreshToken = res.body.data.refreshToken;
        userId = res.body.data.user.id;
      });
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer() as string)
      .post('/auth/login')
      .send({
        email: registerDto.email,
        password: registerDto.password,
      })
      .expect(200)
      .expect((res: { body: AuthResponse }) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
      });
  });

  it('/auth/me (GET)', () => {
    return request(app.getHttpServer() as string)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: MeResponse }) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe(registerDto.email);
      });
  });

  it('/auth/refresh-token (POST)', () => {
    return request(app.getHttpServer() as string)
      .post('/auth/refresh-token')
      .send({ refreshToken, userId })
      .expect(200)
      .expect((res: { body: AuthResponse }) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
      });
  });
});
