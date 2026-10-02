/*
  Warnings:

  - You are about to drop the column `pan` on the `Merchant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "pan",
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "kycRejectReason" TEXT,
ADD COLUMN     "kycReviewedAt" TIMESTAMP(3),
ADD COLUMN     "kycSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "panEnc" TEXT,
ADD COLUMN     "panLast4" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT;
CREATE UNIQUE INDEX "BankAccount_one_primary_per_merchant"
  ON "BankAccount"("merchantId") WHERE "isPrimary" = true;