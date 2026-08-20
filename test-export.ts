import { prisma } from './src/repositories/prisma';

async function main() {
  try {
    const userUnits = await prisma.userUnit.findMany({
      include: {
        user: { select: { nip: true, name: true } },
        unit: { select: { name: true } }
      }
    });
    console.log(userUnits);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();
