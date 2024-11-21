-- AlterTable
ALTER TABLE "node_relationships" ADD COLUMN     "vectorId" TEXT;

-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "vectorId" TEXT;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "vectorId" TEXT;
