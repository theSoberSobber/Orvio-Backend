import { HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

export function toRpcException(exception: HttpException): RpcException {
  return new RpcException({
    statusCode: exception.getStatus(),
    message: exception.message,
    error: exception.getResponse(),
  });
}