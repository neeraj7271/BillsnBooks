import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  DomainError,
  UnbalancedVoucherError,
  PostedVoucherImmutableError,
  NegativeAmountError,
  EmptyVoucherError,
} from '@platform/accounting-core';
import { ApiErrorEnvelope } from '@platform/shared-types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as { message?: string }).message || exception.message;
        details = res;
      }
      code = exception.name;
    } else if (exception instanceof UnbalancedVoucherError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = exception.message;
      code = 'UNBALANCED_VOUCHER';
      details = {
        voucherId: exception.voucherId,
        totalDebit: exception.totalDebit,
        totalCredit: exception.totalCredit,
        difference: exception.difference,
      };
    } else if (exception instanceof PostedVoucherImmutableError) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      code = 'POSTED_VOUCHER_IMMUTABLE';
    } else if (exception instanceof NegativeAmountError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = 'NEGATIVE_AMOUNT_PROHIBITED';
    } else if (exception instanceof EmptyVoucherError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = 'EMPTY_VOUCHER_PROHIBITED';
    } else if (exception instanceof DomainError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = 'DOMAIN_RULE_VIOLATION';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorEnvelope: ApiErrorEnvelope = {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: (request.headers['x-correlation-id'] as string) || undefined,
    };

    response.status(status).json({
      success: false,
      error: errorEnvelope,
    });
  }
}

