import { AppException } from './base.exception.js';
import { HttpStatus } from '../../constants/status.constants.js';

export class ExternalProviderException extends AppException {
  public readonly statusCode = HttpStatus.BAD_GATEWAY;
  public readonly code = 'EXTERNAL_PROVIDER_ERROR';

  constructor(message = 'External provider failure', details: unknown[] = []) {
    super(message, details);
  }
}
