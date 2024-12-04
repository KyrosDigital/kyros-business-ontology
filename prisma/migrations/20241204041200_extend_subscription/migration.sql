/*
  Warnings:

  - You are about to drop the column `planName` on the `subscriptions` table. All the data in the column will be lost.
  - Added the required column `plan` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "planName",
ADD COLUMN     "aiPromptsLimit" INTEGER,
ADD COLUMN     "aiPromptsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nodesPerOntologyLimit" INTEGER,
ADD COLUMN     "ontologyLimit" INTEGER,
ADD COLUMN     "plan" "SubscriptionPlan" NOT NULL,
ADD COLUMN     "relationshipsPerOntologyLimit" INTEGER,
ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "ontology_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ontologyId" TEXT NOT NULL,
    "nodeCount" INTEGER NOT NULL DEFAULT 0,
    "relationshipCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompt_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "month" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompt_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ontology_usage_organizationId_ontologyId_key" ON "ontology_usage"("organizationId", "ontologyId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_usage_organizationId_month_key" ON "ai_prompt_usage"("organizationId", "month");
