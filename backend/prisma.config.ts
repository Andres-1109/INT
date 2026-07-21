/*
  FILE: prisma.config.ts

  Prisma 7 moved the database connection URL and the seed command out
  of schema.prisma and into this file. This did not exist in Prisma 6
  and earlier.
*/

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts'
  },
  datasource: {
    url: env('DATABASE_URL')
  }
});
