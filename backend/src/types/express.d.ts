import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'admin' | 'manager' | 'employee';
        email: string;
        name: string;
        manager_id?: string;
        department?: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}
