import { BadRequestException } from '@nestjs/common';
import { Role } from '../enums/role.enum';

const PHONE_RE = /^\d{10}$/;

function normalizeEmail(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  return t ? t : null;
}

function normalizePhone(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  return t ? t : null;
}

/**
 * Enforces: ADMIN must have email (login identifier); DRIVER must have 10-digit phone (login identifier).
 * Driver email is optional. Admin phone is optional.
 */
export function validateUserIdentifiersForRole(
  role: Role,
  fields: { email?: string | null; phone?: string | null },
): { email: string | null; phone: string | null } {
  const email = normalizeEmail(fields.email);
  const phone = normalizePhone(fields.phone);

  if (role === Role.ADMIN) {
    if (!email) {
      throw new BadRequestException('Admin users must have an email address');
    }
    if (phone !== null && !PHONE_RE.test(phone)) {
      throw new BadRequestException('Phone must be exactly 10 digits');
    }
    return { email, phone };
  }

  if (role === Role.DRIVER) {
    if (!phone || !PHONE_RE.test(phone)) {
      throw new BadRequestException('Driver users must have a 10-digit mobile number');
    }
    return { email, phone };
  }

  return { email, phone };
}
