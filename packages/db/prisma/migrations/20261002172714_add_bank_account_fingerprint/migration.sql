/*
  Warnings:

  - A unique constraint covering the columns `[merchantId,fingerprint]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fingerprint` to the `BankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "fingerprint" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_merchantId_fingerprint_key" ON "BankAccount"("merchantId", "fingerprint");
