import { Test, TestingModule } from '@nestjs/testing';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';

describe('FcmController', () => {
  let fcmController: FcmController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FcmController],
      providers: [FcmService],
    }).compile();

    fcmController = app.get<FcmController>(FcmController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(fcmController.getHello()).toBe('Hello World!');
    });
  });
});
