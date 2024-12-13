/*
  Warnings:

  - You are about to drop the column `type` on the `nodes` table. All the data in the column will be lost.
  - Added the required column `typeId` to the `nodes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nodes" DROP COLUMN "type",
ADD COLUMN     "typeId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "NodeType";

-- CreateTable
CREATE TABLE "custom_node_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hexColor" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_node_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_node_types_organizationId_name_key" ON "custom_node_types"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "custom_node_types" ADD CONSTRAINT "custom_node_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "custom_node_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
