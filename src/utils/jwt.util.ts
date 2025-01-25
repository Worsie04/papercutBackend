import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  id: string;
  email: string;
  type: 'user' | 'admin';
  role?: string;
}

export class JwtUtil {
  private static readonly SECRET = config.jwt.secret;
  private static readonly EXPIRES_IN = config.jwt.expiresIn;

  static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.SECRET, {
      expiresIn: this.EXPIRES_IN,
    });
  }

  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  static generateRefreshToken(userId: string, type: 'user' | 'admin'): string {
    return jwt.sign({ id: userId, type }, this.SECRET, {
      expiresIn: '7d',
    });
  }
} 