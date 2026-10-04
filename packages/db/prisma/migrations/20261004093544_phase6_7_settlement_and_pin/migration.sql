/*
  Warnings:

  - You are about to drop the column `removedAt` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the column `autoSettle` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `failureReason` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the `OtpChallenge` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OtpChallenge" DROP CONSTRAINT "OtpChallenge_merchantId_fkey";

-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "removedAt";

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "autoSettle";

-- AlterTable
ALTER TABLE "Settlement" DROP COLUMN "failureReason",
DROP COLUMN "source";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3);

-- DropTable
DROP TABLE "OtpChallenge";
