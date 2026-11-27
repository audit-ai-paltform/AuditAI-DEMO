import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { DatabaseException } from '../core/exceptions/database.exception.js';

export class DatabaseUtils {
  /**
   * Generates a new cryptographically strong UUID v4.
   */
  public static generateUUID(): string {
    return uuidv4();
  }

  /**
   * Validates if a string is a valid UUID v4 format.
   */
  public static isValidUUID(uuid: string): boolean {
    return uuidValidate(uuid);
  }

  /**
   * Formats a Date object into an ISO-8601 string.
   */
  public static formatISO(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Unwraps PostgREST query result, throwing a typed DatabaseException if an error occurs.
   */
  public static unwrapResponse<T>(data: T | null, error: { message: string; details?: string } | null): T {
    if (error) {
      throw new DatabaseException(`Database query failed: ${error.message}`, error.details ? [error.details] : []);
    }
    if (data === null) {
      throw new DatabaseException('Database query returned null payload');
    }
    return data;
  }

  /**
   * Computes pagination zero-indexed range offset for Supabase query `.range(from, to)`.
   */
  public static calculatePaginationOffset(page = 1, limit = 20): { from: number; to: number } {
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit));
    const from = (validPage - 1) * validLimit;
    const to = from + validLimit - 1;
    return { from, to };
  }
}
