import crypto from 'crypto';
import { JwtPayload } from './auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'auditai_enterprise_jwt_super_secret_key_2026';
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

export class AuthCrypto {
  /**
   * Securely hash password with SHA-256 and salt
   */
  static hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
    const salt = customSalt || crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');
    return { hash, salt };
  }

  /**
   * Verify password against stored hash using constant-time comparison
   */
  static verifyPassword(password: string, storedHash: string, salt: string): boolean {
    const { hash } = this.hashPassword(password, salt);
    try {
      const bufA = Buffer.from(hash, 'hex');
      const bufB = Buffer.from(storedHash, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Generate signed JWT token
   */
  static signToken(payload: JwtPayload, expiresInSeconds = TOKEN_EXPIRY_SECONDS): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        iat: now,
        exp: now + expiresInSeconds,
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      if (!header || !body || !signature) return null;

      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'))) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null; // Expired
      }

      return decoded;
    } catch {
      return null;
    }
  }
}
