import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';

describe('Auth Service (e2e)', () => {
  let app: INestApplication;
  let refreshToken: string;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // This should load your complete app
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let phoneNumber = `+123456789${Math.floor(1000 + Math.random() * 9000)}`;
  let transactionId: string;

  it('should send OTP for signup', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ phoneNumber });

    expect(response.status).toBe(201);
    expect(response.body.transactionId).toBeDefined();

    transactionId = response.body.transactionId;
  });

  it('should verify OTP', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ transactionId, userInputOtp: '123456' }); // Assuming test OTP

    expect(response.status).toBe(201);
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.accessToken).toBeDefined();

    refreshToken = response.body.refreshToken;
    accessToken = response.body.accessToken;
  });

  it('should refresh access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();

    accessToken = response.body.accessToken;
  });

  it('should register a device', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ accessToken, phoneNumber: phoneNumber, fcmToken: 'test-fcm-token' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should return user info (me)', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBeDefined();
  });

  it('should sign out', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signout')
      .send({ refreshToken });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should return 401 for invalid refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid-token' });

    expect(response.status).toBe(401);
  });
});
