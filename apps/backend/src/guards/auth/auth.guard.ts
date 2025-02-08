import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization Header');
    }

    const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      request.user = decoded; // Attach user details to request
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or Expired Access Token');
    }
  }
}