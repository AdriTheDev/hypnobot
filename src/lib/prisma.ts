import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';

const ssl = process.env.DATABASE_SSL_CA_PATH
  ? { ca: readFileSync(process.env.DATABASE_SSL_CA_PATH, 'utf8') }
  : undefined;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl });
export const prisma = new PrismaClient({ adapter });
