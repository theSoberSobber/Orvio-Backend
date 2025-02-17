import { Controller, Post, Body, Inject, Get, UseGuards, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../../../guards/auth/auth.guard'

@Controller('service')
export class ServiceController {
    constructor(@Inject('SERVICE_SERVICE') private readonly serviceService: ClientProxy) {}

    @UseGuards(AuthGuard)
    @Post("/sendOtp")
    async sendOtp(@Body() data: {phoneNumber: string}, @Req() req){
        const userId = req.user.userId;
        console.log("the api gateway controller recieved the request...", data, userId);
        return await this.serviceService.send("service.sendOtp", {userId, ...data}).toPromise();
    }

    @UseGuards(AuthGuard)
    @Post("/verifyOtp")
    async verifyOtp(@Body() data: {tid: string, userInputOtp: string}){
        return await this.serviceService.send("service.verifyOtp", data).toPromise();
    }

    @UseGuards(AuthGuard)
    @Post("/ack")
    async ack(@Body() data: {tid: string}, @Req() req){
        const userId = req.user.userId;
        const sessionId = req.user.sessionId;
        console.log("the api gateway controller recieved the request...", data, userId, sessionId);
        return await this.serviceService.send("service.ack", {userId, sessionId, ...data}).toPromise();
    }
}
