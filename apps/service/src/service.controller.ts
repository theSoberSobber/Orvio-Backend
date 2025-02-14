import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServiceService } from './service.service';

@Controller()
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  // TODO: /ack for clients???
  // should wait on /ack for clients instead of simply just saying
  // fcm service should handle things
  
  // /ack IMPLEMENTATION: TODO: ASAP

  @MessagePattern('service.sendOtp')
  async sendOtp(@Payload() data: { userIdThatRequested: string, phoneNumber: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string }) {
    // TODO: which user has sent what amount
    // userId can forward from auth guard
    return this.serviceService.sendOtp(data.userIdThatRequested, data.phoneNumber, data.reportingCustomerWebhook, data.reportingCustomerWebhookSecret);
  }

  @MessagePattern('service.verifyOtp')
  async verifyOtp(@Payload() data: { tid: string; userInputOtp: string }) {
    return this.serviceService.verifyOtp(data.tid, data.userInputOtp);
  }

  @MessagePattern('service.ack')
  async ack(@Payload() data: { userIdThatFullfilled: string, tid: string, sessionId: string;}) {
    this.serviceService.ack(data.userIdThatFullfilled, data.tid, data.sessionId);
  }
}