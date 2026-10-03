/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.
  - The required column `publicId` was added to the `Merchant` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
ALTER TABLE "Merchant" ADD COLUMN "publicId" TEXT;
UPDATE "Merchant" SET "publicId" = gen_random_uuid()::text WHERE "publicId" IS NULL;
ALTER TABLE "Merchant" ALTER COLUMN "publicId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_publicId_key" ON "Merchant"("publicId");

-- CreateIndex
CREATE INDEX "MerchantPayment_fromUserId_createdAt_idx" ON "MerchantPayment"("fromUserId", "createdAt");
