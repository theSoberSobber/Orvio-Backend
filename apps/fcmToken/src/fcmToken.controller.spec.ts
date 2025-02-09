import { Test, TestingModule } from '@nestjs/testing';
import { FcmTokenController } from './fcmToken.controller';
import { FcmTokenService } from './fcmToken.service';

describe('FcmController', () => {
  let fcmController: FcmTokenController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FcmTokenController],
      providers: [FcmTokenService],
    }).compile();

    fcmController = app.get<FcmTokenController>(FcmTokenController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(FcmTokenController.getHello()).toBe('Hello World!');
    });
  });
});
