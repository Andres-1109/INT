/*
  FILE: src/controllers/authController.ts

  What does this file do?
  Handles "create account" and "log in" requests, reading and writing
  real data through Prisma.

  Security note: the password is never stored as the user typed it. It
  goes through bcrypt, which turns it into meaningless, irreversible
  text (a "hash"), and that's the only thing ever stored.

  Merge note: the original Daniel repo tried to encrypt email/name/phone
  with AES-256-GCM before storing them, generating a random IV on every
  call. That makes the ciphertext different every time, even for the
  same input — so looking up a user by their (re-encrypted) email at
  login time would almost never match what was stored at registration.
  That approach is not used here. Email is stored as plain, indexed,
  unique text (the normal approach for a login field), and only the
  password is hashed — which is the only field that must never be
  reversible.
*/

import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { signToken } from '../middleware/authMiddleware.js';
import { AppError } from '../utils/AppError.js';
import type { RegisterInput, LoginInput } from '../validators/authValidators.js';

function mapUser(user: {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  systemRole: string;
  isHost: boolean;
  freeBookingsUsed: number;
  nationalId: string | null;
  nationalIdDocUrl: string | null;
  bankCertificateUrl: string | null;
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    // The frontend still reads "role" as 'wspacer' | 'wspacer_plus' — see
    // navbar.js / auth.js. isHost is what actually drives that value.
    role: user.isHost ? 'wspacer_plus' : 'wspacer',
    // systemRole ('user' | 'admin') was never sent to the frontend before,
    // so there was no way to show/gate the admin panel (see adminSpaces.js).
    systemRole: user.systemRole,
    // Lets the frontend know, without a second request, whether this
    // account can publish a space yet — see spacesController.createSpace,
    // which enforces the same check server-side.
    hasVerificationDocuments: Boolean(user.nationalId && user.nationalIdDocUrl && user.bankCertificateUrl),
    freeBookingsUsed: user.freeBookingsUsed
  };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, email, phone, password } = req.body as RegisterInput;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw AppError.conflict('Este correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        acceptedDataPolicy: true
      }
    });

    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw AppError.unauthorized('Correo o contraseña incorrectos');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw AppError.unauthorized('Correo o contraseña incorrectos');
    }

    const token = signToken({ id: user.id, email: user.email, role: user.systemRole });

    res.json({ token, user: mapUser(user) });
  } catch (error) {
    next(error);
  }
}
