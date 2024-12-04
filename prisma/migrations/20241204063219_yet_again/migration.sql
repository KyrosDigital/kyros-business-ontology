/*
  Warnings:

  - You are about to drop the column `month` on the `ai_prompt_usage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId]` on the table `ai_prompt_usage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ai_prompt_usage_organizationId_month_key";

-- AlterTable
ALTER TABLE "ai_prompt_usage" DROP COLUMN "month";

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_usage_organizationId_key" ON "ai_prompt_usage"("organizationId");
