import { Controller, Post, Body, UseGuards, Req, Get, Patch } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth/auth.guard';
import { ServiceService } from '../../../services/service/service.service';
import { CreditMode } from 'apps/shared/entities/user.entity';

@Controller('service')
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) {}

    @UseGuards(AuthGuard)
    @Post("/sendOtp")
    async sendOtp(@Body() data: {
        phoneNumber: string, 
        otpExpiry?: number,
        reportingCustomerWebhook?: string,
        reportingCustomerWebhookSecret?: string,
        orgName?: string
    }, @Req() req){
        const userId = req.user.userId;
        return await this.serviceService.sendOtp(
            userId, 
            data.phoneNumber, 
            data.reportingCustomerWebhook, 
            data.reportingCustomerWebhookSecret, 
            data.otpExpiry,
            data.orgName
        );
    }

    @UseGuards(AuthGuard)
    @Post("/verifyOtp")
    async verifyOtp(@Body() data: {tid: string, userInputOtp: string}){
        return await this.serviceService.verifyOtp(data.tid, data.userInputOtp);
    }

    @UseGuards(AuthGuard)
    @Post("/ack")
    async ack(@Body() data: {tid: string}, @Req() req){
        const userId = req.user.userId;
        const sessionId = req.user.sessionId;
        console.log("Received ACK!");
        return await this.serviceService.ack(userId, data.tid, sessionId);
    }

    @UseGuards(AuthGuard)
    @Get("/credits")
    async getCredits(@Req() req) {
        const userId = req.user.userId;
        const credits = await this.serviceService.getUserCredits(userId);
        return { credits };
    }

    @UseGuards(AuthGuard)
    @Get("/creditMode")
    async getCreditMode(@Req() req) {
        const userId = req.user.userId;
        const mode = await this.serviceService.getUserCreditMode(userId);
        return { mode };
    }

    // @UseGuards(AuthGuard)
    // @Patch("/creditMode")
    // async setCreditMode(@Body() data: { mode: CreditMode }, @Req() req) {
    //     const userId = req.user.userId;
    //     await this.serviceService.setUserCreditMode(userId, data.mode);
    //     return { success: true };
    // }
}
