import jwt, { SignOptions } from 'jsonwebtoken';
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
  private static readonly REFRESH_EXPIRES_IN = '7d'; // 7 days

  static generateToken(payload: TokenPayload): string {
    return jwt.sign(
      payload as any, 
      this.SECRET as string, 
      { expiresIn: this.EXPIRES_IN } as SignOptions
    );
  }

  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.SECRET as string) as TokenPayload;
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

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(
      payload as any, 
      this.SECRET as string, 
      { expiresIn: this.REFRESH_EXPIRES_IN } as SignOptions
    );
  }
  
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.SECRET as string) as TokenPayload;
    } catch (error: any) {
      // Provide more specific error messages based on the type of error
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error(`Invalid refresh token: ${error.message}`);
      } else {
        throw new Error(`Refresh token verification failed: ${error.message}`);
      }
    }
  }
}