import { Controller, Post, Body, Inject, Get, UseGuards, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../../../guards/auth/auth.guard'

@Controller('service')
export class ServiceController {
    constructor(@Inject('SERVICE_SERVICE') private readonly serviceService: ClientProxy) {}

    @UseGuards(AuthGuard)
    @Post("/sendOtp")
    async sendOtp(data: {phoneNumber: string}){
        return await this.serviceService.send("service.sendOtp", data).toPromise();
    }

    @UseGuards(AuthGuard)
    @Post("/verifyOtp")
    async verifyOtp(data: {tid: string, userInputOtp: string}){
        return await this.serviceService.send("service.verifyOtp", data).toPromise();
    }

    @UseGuards(AuthGuard)
    @Post("/ack")
    async ack(data: {tid: string}){
        return await this.serviceService.send("service.ack", data).toPromise();
    }
}
