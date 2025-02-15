import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcToHttpExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const errorResponse = exception.getError();

    if (typeof errorResponse === 'object' && 'statusCode' in errorResponse) {
      // Use type assertion to tell TypeScript it has `statusCode` and `error`
      const rpcError = errorResponse as { statusCode: number; error: string };
      return throwError(() => new HttpException(rpcError.error, rpcError.statusCode));
    }

    return throwError(() => new HttpException(errorResponse || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR));
  }
}