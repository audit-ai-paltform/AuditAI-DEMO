import { AppException } from './base.exception.js';
import { HttpStatus } from '../../constants/status.constants.js';

export class NotFoundException extends AppException {
  public readonly statusCode = HttpStatus.NOT_FOUND;
  public readonly code = 'NOT_FOUND';

  constructor(message = 'Resource not found', details: unknown[] = []) {
    super(message, details);
  }
}
