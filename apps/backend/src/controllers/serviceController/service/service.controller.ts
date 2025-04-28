import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth/auth.guard';
import { ServiceService } from '../../../services/service/service.service';

@Controller('service')
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) {}

    @UseGuards(AuthGuard)
    @Post("/sendOtp")
    async sendOtp(@Body() data: {phoneNumber: string}, @Req() req){
        const userId = req.user.userId;
        return await this.serviceService.sendOtp(userId, data.phoneNumber);
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
}
