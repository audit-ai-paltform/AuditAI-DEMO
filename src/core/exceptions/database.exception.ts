import { AppException } from './base.exception.js';
import { HttpStatus } from '../../constants/status.constants.js';

export class DatabaseException extends AppException {
  public readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  public readonly code = 'DATABASE_ERROR';

  constructor(message = 'Database operation failed', details: unknown[] = []) {
    super(message, details);
  }
}

export class StorageException extends AppException {
  public readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  public readonly code = 'STORAGE_ERROR';

  constructor(message = 'Storage operation failed', details: unknown[] = []) {
    super(message, details);
  }
}

export class RealtimeException extends AppException {
  public readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  public readonly code = 'REALTIME_ERROR';

  constructor(message = 'Realtime subscription operation failed', details: unknown[] = []) {
    super(message, details);
  }
}
