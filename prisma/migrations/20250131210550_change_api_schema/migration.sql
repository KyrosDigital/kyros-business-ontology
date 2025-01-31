/*
  Warnings:

  - You are about to drop the column `createdById` on the `api_keys` table. All the data in the column will be lost.
  - Added the required column `clerkId` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `api_keys` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_createdById_fkey";

-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "createdById",
ADD COLUMN     "clerkId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
