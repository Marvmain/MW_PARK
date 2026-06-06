import { Request, Response, NextFunction } from 'express';
import { Customer, AdminRole } from '../../src/types';
import { getCustomerFromToken } from './auth';
import { verifyAdminToken, AdminSession } from './adminAuth';

declare global {
  namespace Express {
    interface Request {
      customer?: Customer;
      admin?: AdminSession;
    }
  }
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const adminSession = verifyAdminToken(token);
  if (adminSession) {
    res.status(403).json({ error: 'Admin accounts cannot access customer endpoints.' });
    return;
  }

  const customer = await getCustomerFromToken(req.headers.authorization);
  if (!customer) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  req.customer = customer;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }

  const adminSession = verifyAdminToken(token);
  if (!adminSession) {
    res.status(401).json({ error: 'Invalid or expired admin session. Please log in again.' });
    return;
  }

  req.admin = adminSession;
  next();
}

export function requireAdminRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: 'Admin authentication required.' });
      return;
    }

    if (!roles.includes(req.admin.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }

    next();
  };
}
