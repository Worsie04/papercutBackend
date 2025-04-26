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
    // console.log('Generating token with expiresIn:', this.EXPIRES_IN);
    // console.log('Using JWT Secret:', this.SECRET);
    return jwt.sign(payload, this.SECRET, {
      expiresIn: this.EXPIRES_IN,
    });
  }

  static verifyToken(token: string): TokenPayload {
    //console.log('Using JWT VERİFY Secret :', this.SECRET);
    try {
      return jwt.verify(token, this.SECRET) as TokenPayload;
    } catch (error: any) {
      // Provide more specific error messages based on the type of error
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error(`Invalid token: ${error.message}`);
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
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