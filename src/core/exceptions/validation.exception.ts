import { AppException } from './base.exception.js';
import { HttpStatus } from '../../constants/status.constants.js';

export class ValidationException extends AppException {
  public readonly statusCode = HttpStatus.BAD_REQUEST;
  public readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Validation failed', details: unknown[] = []) {
    super(message, details);
  }
}
