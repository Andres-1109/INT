/*
  FILE: src/config/db.ts

  What does this file do?
  Creates a single Prisma Client instance and exports it, so every
  other file in the backend imports the SAME connection instead of
  opening a new one each time.

  Prisma 7 note: PrismaClient can no longer open a database connection
  on its own — it requires an explicit driver adapter. This uses
  @prisma/adapter-pg (the official adapter for node-postgres) pointed
  at DATABASE_URL.
*/

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;
