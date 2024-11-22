/*
  Warnings:

  - Added the required column `ontologyId` to the `node_relationships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ontologyId` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ontologyId` to the `notes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "node_relationships" ADD COLUMN     "ontologyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "ontologyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "ontologyId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pineconeIndex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontologies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pineconeNamespace" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_links" (
    "id" TEXT NOT NULL,
    "fromOntologyId" TEXT NOT NULL,
    "toOntologyId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_links_fromOntologyId_toOntologyId_key" ON "ontology_links"("fromOntologyId", "toOntologyId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontologies" ADD CONSTRAINT "ontologies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontology_links" ADD CONSTRAINT "ontology_links_fromOntologyId_fkey" FOREIGN KEY ("fromOntologyId") REFERENCES "ontologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontology_links" ADD CONSTRAINT "ontology_links_toOntologyId_fkey" FOREIGN KEY ("toOntologyId") REFERENCES "ontologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_ontologyId_fkey" FOREIGN KEY ("ontologyId") REFERENCES "ontologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_relationships" ADD CONSTRAINT "node_relationships_ontologyId_fkey" FOREIGN KEY ("ontologyId") REFERENCES "ontologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_ontologyId_fkey" FOREIGN KEY ("ontologyId") REFERENCES "ontologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
