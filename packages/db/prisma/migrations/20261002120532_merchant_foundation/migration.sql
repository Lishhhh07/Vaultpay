/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TxnStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- AlterEnum
ALTER TYPE "AuthType" ADD VALUE 'Credentials';

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "MerchantBalance" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "locked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MerchantBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "holderName" TEXT NOT NULL,
    "accountNoEnc" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoundboxPlan" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SoundboxPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoundboxOrder" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoundboxOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Soundbox" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'INACTIVE',
    "language" TEXT NOT NULL DEFAULT 'en',
    "activatedAt" TIMESTAMP(3),
    "merchantId" INTEGER,
    "orderId" INTEGER,

    CONSTRAINT "Soundbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantPayment" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "TxnStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "bankAccountId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "utr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantBalance_merchantId_key" ON "MerchantBalance"("merchantId");

-- CreateIndex
CREATE INDEX "BankAccount_merchantId_idx" ON "BankAccount"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "SoundboxPlan_code_key" ON "SoundboxPlan"("code");

-- CreateIndex
CREATE INDEX "SoundboxOrder_merchantId_idx" ON "SoundboxOrder"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Soundbox_deviceId_key" ON "Soundbox"("deviceId");

-- CreateIndex
CREATE INDEX "Soundbox_merchantId_idx" ON "Soundbox"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPayment_idempotencyKey_key" ON "MerchantPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MerchantPayment_merchantId_createdAt_idx" ON "MerchantPayment"("merchantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_utr_key" ON "Settlement"("utr");

-- CreateIndex
CREATE INDEX "Settlement_merchantId_createdAt_idx" ON "Settlement"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_createdAt_idx" ON "AuditLog"("actorType", "actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_phone_key" ON "Merchant"("phone");

-- AddForeignKey
ALTER TABLE "MerchantBalance" ADD CONSTRAINT "MerchantBalance_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoundboxOrder" ADD CONSTRAINT "SoundboxOrder_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoundboxOrder" ADD CONSTRAINT "SoundboxOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SoundboxPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soundbox" ADD CONSTRAINT "Soundbox_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soundbox" ADD CONSTRAINT "Soundbox_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SoundboxOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayment" ADD CONSTRAINT "MerchantPayment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayment" ADD CONSTRAINT "MerchantPayment_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
