import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl });
export const prisma = new PrismaClient({ adapter });
