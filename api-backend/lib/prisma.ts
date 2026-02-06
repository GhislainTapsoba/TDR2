// Use existing db connection instead of Prisma
import { db } from './db'

export const prisma = db
