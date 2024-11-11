/*
  Warnings:

  - You are about to drop the column `modelVersion` on the `ai_components` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `ai_components` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `ai_components` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `analytics` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `analytics` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `data_sources` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `data_sources` table. All the data in the column will be lost.
  - You are about to drop the column `previous_version` on the `integrations` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `integrations` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `integrations` table. All the data in the column will be lost.
  - You are about to drop the column `previous_version` on the `processes` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `processes` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `processes` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `previous_version` on the `software_tools` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `software_tools` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `software_tools` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `versionDate` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_components" DROP COLUMN "modelVersion",
DROP COLUMN "version",
DROP COLUMN "versionDate";

-- AlterTable
ALTER TABLE "analytics" DROP COLUMN "version",
DROP COLUMN "versionDate";

-- AlterTable
ALTER TABLE "data_sources" DROP COLUMN "version",
DROP COLUMN "versionDate";

-- AlterTable
ALTER TABLE "integrations" DROP COLUMN "previous_version",
DROP COLUMN "version",
DROP COLUMN "versionDate";

-- AlterTable
ALTER TABLE "processes" DROP COLUMN "previous_version",
DROP COLUMN "version",
DROP COLUMN "versionDate";

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "version",
DROP COLUMN "versionDate";

-- AlterTable
ALTER TABLE "software_tools" DROP COLUMN "previous_version",
DROP COLUMN "version",
DROP COLUMN "versionDate";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "version",
DROP COLUMN "versionDate";
