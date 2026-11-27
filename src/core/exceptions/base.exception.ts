import { HttpStatus } from '../../constants/status.constants.js';

export abstract class AppException extends Error {
  public abstract readonly statusCode: HttpStatus;
  public abstract readonly code: string;
  public readonly details: unknown[];

  constructor(message: string, details: unknown[] = []) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
