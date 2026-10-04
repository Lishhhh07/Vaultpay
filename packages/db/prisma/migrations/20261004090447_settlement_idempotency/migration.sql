/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Settlement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "removedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "autoSettle" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "binding" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpChallenge_merchantId_createdAt_idx" ON "OtpChallenge"("merchantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_idempotencyKey_key" ON "Settlement"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
