import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import fs from 'fs'
import path from 'path'

const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL
  }
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return 'file:/tmp/meal_fresh.db'
  }
  return 'file:./dev.db'
}

const prismaClientSingleton = () => {
  const dbUrl = getDatabaseUrl()
  
  if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://')) {
    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN
    })
    const adapter = new PrismaLibSql(libsql as any)
    return new PrismaClient({ adapter })
  }

  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true })
      } catch (e) {
        // Ignorer
      }
    }
  }

  const adapter = new PrismaBetterSqlite3({ url: dbUrl } as any)
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

/**
 * Auto-initialisation des tables SQLite en cas de conteneur Vercel Serverless.
 */
let isSchemaInitialized = false

export async function ensureDatabaseSchema() {
  if (isSchemaInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Recipe" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "urlSource" TEXT,
        "instructions" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Ingredient" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
        "recipeId" TEXT NOT NULL,
        "ingredientId" TEXT NOT NULL,
        "quantity" TEXT,
        PRIMARY KEY ("recipeId", "ingredientId"),
        FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Planning" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" DATETIME NOT NULL,
        "mealTime" TEXT NOT NULL,
        "recipeId" TEXT NOT NULL,
        FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MonthlyBudget" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "month" TEXT NOT NULL UNIQUE,
        "amount" REAL NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Expense" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" DATETIME NOT NULL,
        "amount" REAL NOT NULL,
        "category" TEXT NOT NULL,
        "description" TEXT,
        "monthlyBudgetId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("monthlyBudgetId") REFERENCES "MonthlyBudget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    isSchemaInitialized = true
  } catch (err) {
    console.error("Schema init error:", err)
  }
}
