import { AppException } from './base.exception.js';
import { HttpStatus } from '../../constants/status.constants.js';

export class UnauthorizedException extends AppException {
  public readonly statusCode = HttpStatus.UNAUTHORIZED;
  public readonly code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized access', details: unknown[] = []) {
    super(message, details);
  }
}

export class ForbiddenException extends AppException {
  public readonly statusCode = HttpStatus.FORBIDDEN;
  public readonly code = 'FORBIDDEN';

  constructor(message = 'Forbidden access', details: unknown[] = []) {
    super(message, details);
  }
}
