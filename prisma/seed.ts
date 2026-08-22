import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" } as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  const categories = [
    "Protéines",
    "Glucides",
    "Légumes",
    "Fruits",
    "Produits Laitiers",
    "Matières Grasses",
    "Épices & Condiments"
  ]

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  
  console.log("Catégories classiques créées avec succès !")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
