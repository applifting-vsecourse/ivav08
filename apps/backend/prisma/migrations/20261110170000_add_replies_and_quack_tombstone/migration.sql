-- Additive only: safe on a production database that already has quacks.
-- Existing quacks get deletedAt = NULL (= not deleted); the reply table starts empty.

-- AlterTable
ALTER TABLE "quack" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "reply" (
    "id" TEXT NOT NULL,
    "text" VARCHAR(280) NOT NULL,
    "quackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reply_quackId_createdAt_idx" ON "reply"("quackId", "createdAt");

-- CreateIndex
CREATE INDEX "reply_userId_idx" ON "reply"("userId");

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_quackId_fkey" FOREIGN KEY ("quackId") REFERENCES "quack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
