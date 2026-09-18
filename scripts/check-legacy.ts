import { db } from "../lib/db";

async function main() {
  const nullCount = await db.orm.public.Guest.where(g => g.importBatchId.eq(null)).count();
  console.log(`Guests with null importBatchId: ${nullCount}`);

  const batches = await db.orm.public.ImportBatch.all();
  console.log("Batches:", batches);
}

main().catch(console.error);
