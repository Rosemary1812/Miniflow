/*
  Warnings:

  - You are about to drop the `Execution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NodeExecution` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'DISCORD';
ALTER TYPE "NodeType" ADD VALUE 'SLACK';

-- DropForeignKey
ALTER TABLE "public"."Execution" DROP CONSTRAINT "Execution_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Execution" DROP CONSTRAINT "Execution_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NodeExecution" DROP CONSTRAINT "NodeExecution_executionId_fkey";

-- DropTable
DROP TABLE "public"."Execution";

-- DropTable
DROP TABLE "public"."NodeExecution";

-- DropEnum
DROP TYPE "public"."ExecutionStatus";
