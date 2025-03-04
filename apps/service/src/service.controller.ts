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
  async sendOtp(@Payload() data: { userId: string, phoneNumber: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string }) {
    const userIdThatRequested = data.userId;
    // TODO: which user has sent whatamount
    // userId can forward from auth guard
    console.log("Received at the service microservice controller...", data);
    return this.serviceService.sendOtp(userIdThatRequested, data.phoneNumber, data.reportingCustomerWebhook, data.reportingCustomerWebhookSecret);
  }

  @MessagePattern('service.verifyOtp')
  async verifyOtp(@Payload() data: { tid: string; userInputOtp: string }) {
    return this.serviceService.verifyOtp(data.tid, data.userInputOtp);
  }

  @MessagePattern('service.ack')
  async ack(@Payload() data: { userId: string, tid: string, sessionId: string }) {
    const userIdThatFullfilled = data.sessionId;
    const sessionId = data.sessionId;
    this.serviceService.ack(userIdThatFullfilled, data.tid, sessionId);
  }
}