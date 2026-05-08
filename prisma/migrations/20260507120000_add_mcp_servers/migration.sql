-- CreateEnum
CREATE TYPE "McpTransport" AS ENUM ('STREAMABLE_HTTP');

-- CreateEnum
CREATE TYPE "McpAuthType" AS ENUM ('NONE', 'BEARER', 'HEADER');

-- AlterEnum
ALTER TYPE "NodeType" ADD VALUE 'MCP_TOOL';

-- CreateTable
CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transport" "McpTransport" NOT NULL DEFAULT 'STREAMABLE_HTTP',
    "url" TEXT NOT NULL,
    "authType" "McpAuthType" NOT NULL DEFAULT 'NONE',
    "encryptedSecret" TEXT,
    "iv" TEXT,
    "authHeaderName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpToolCache" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchema" JSONB,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpToolCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpServer_workspaceId_idx" ON "McpServer"("workspaceId");

-- CreateIndex
CREATE INDEX "McpServer_createdBy_idx" ON "McpServer"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "McpToolCache_mcpServerId_name_key" ON "McpToolCache"("mcpServerId", "name");

-- CreateIndex
CREATE INDEX "McpToolCache_workspaceId_idx" ON "McpToolCache"("workspaceId");

-- CreateIndex
CREATE INDEX "McpToolCache_mcpServerId_idx" ON "McpToolCache"("mcpServerId");

-- AddForeignKey
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpToolCache" ADD CONSTRAINT "McpToolCache_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
