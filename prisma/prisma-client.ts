/* eslint-disable no-var */
/* eslint-disable vars-on-top */
import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: 
// https://pris.ly/d/help/next-js-best-practices

declare global {
	var prisma: PrismaClient | undefined
}
// log: ['query', 'info', 'warn', 'error'],

export const prisma = global.prisma || new PrismaClient({ log: ['warn', 'error'] })

if (process.env.NODE_ENV !== 'production') {
	global.prisma = prisma
}