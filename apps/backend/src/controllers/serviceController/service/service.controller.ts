import { Controller, Post, Body, UseGuards, Req, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../guards/auth/auth.guard';
import { ServiceService } from '../../../services/service/service.service';
import { CreditMode } from 'apps/shared/entities/user.entity';
import { SendOtpDto, VerifyOtpDto, AckDto } from './service.dto';

@ApiTags('Service')
@ApiBearerAuth()
@Controller('service')
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) {}

    @ApiOperation({ summary: 'Send OTP to a phone number' })
    @ApiResponse({ status: 201, description: 'OTP sent successfully' })
    @ApiResponse({ status: 402, description: 'Insufficient credits' })
    @UseGuards(AuthGuard)
    @Post("/sendOtp")
    async sendOtp(@Body() data: SendOtpDto, @Req() req){
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

    @ApiOperation({ summary: 'Verify OTP provided by user' })
    @ApiResponse({ status: 201, description: 'OTP verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid OTP' })
    @UseGuards(AuthGuard)
    @Post("/verifyOtp")
    async verifyOtp(@Body() data: VerifyOtpDto){
        return await this.serviceService.verifyOtp(data.tid, data.userInputOtp);
    }

    @ApiOperation({ summary: 'Acknowledge successful OTP verification' })
    @ApiResponse({ status: 201, description: 'Acknowledgement successful' })
    @UseGuards(AuthGuard)
    @Post("/ack")
    async ack(@Body() data: AckDto, @Req() req){
        const userId = req.user.userId;
        const sessionId = req.user.sessionId;
        console.log("Received ACK!");
        return await this.serviceService.ack(userId, data.tid, sessionId);
    }

    @ApiOperation({ summary: 'Get user credits' })
    @ApiResponse({ status: 200, description: 'Returns current credits' })
    @UseGuards(AuthGuard)
    @Get("/credits")
    async getCredits(@Req() req) {
        const userId = req.user.userId;
        const credits = await this.serviceService.getUserCredits(userId);
        return { credits };
    }

    @ApiOperation({ summary: 'Get user credit mode' })
    @ApiResponse({ status: 200, description: 'Returns current credit mode' })
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
