import { Controller, Post, Body, Inject, Get, UseGuards, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../../../guards/auth/auth.guard'
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiTags('Service')
@ApiBearerAuth() // To indicate authentication is required
@Controller('service')
export class ServiceController {
    constructor(@Inject('SERVICE_SERVICE') private readonly serviceService: ClientProxy) {}

    @UseGuards(AuthGuard)
    @Post("/sendOtp")
    @ApiOperation({ summary: 'Send OTP', description: 'Sends an OTP to the given phone number.' })
    @ApiBody({ schema: { properties: { phoneNumber: { type: 'string', example: '+1234567890' } } } })
    @ApiOkResponse({ description: 'OTP sent successfully.' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
    @ApiForbiddenResponse({ description: 'Forbidden.' })
    async sendOtp(@Body() data: {phoneNumber: string}, @Req() req){
        const userId = req.user.userId;
        return await this.serviceService.send("service.sendOtp", {userId, ...data}).toPromise();
    }

    @UseGuards(AuthGuard)
    @Post("/verifyOtp")
    @ApiOperation({ summary: 'Verify OTP', description: 'Verifies the provided OTP for the transaction.' })
    @ApiBody({ schema: { 
        properties: {
            tid: { type: 'string', example: 'transaction-id' },
            userInputOtp: { type: 'string', example: '123456' }
        } 
    }})
    @ApiOkResponse({ description: 'OTP verified successfully.' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
    @ApiForbiddenResponse({ description: 'Forbidden.' })
    async verifyOtp(@Body() data: {tid: string, userInputOtp: string}){
        return await this.serviceService.send("service.verifyOtp", data).toPromise();
    }

    @UseGuards(AuthGuard)
    @Post("/ack")
    @ApiOperation({ summary: 'Acknowledge', description: 'Acknowledges the transaction with the given tid.' })
    @ApiBody({ schema: { properties: { tid: { type: 'string', example: 'transaction-id' } } } })
    @ApiOkResponse({ description: 'Acknowledged successfully.' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
    @ApiForbiddenResponse({ description: 'Forbidden.' })
    async ack(@Body() data: {tid: string}, @Req() req){
        const userId = req.user.userId;
        const sessionId = req.user.sessionId;
        console.log("Recieved ACK!");
        return await this.serviceService.send("service.ack", {userId, sessionId, ...data}).toPromise();
    }
}