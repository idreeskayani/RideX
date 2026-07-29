-- CreateEnum
CREATE TYPE "RideCategory" AS ENUM ('MINI', 'RIDE_AC', 'PREMIUM');

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN "category" "RideCategory" NOT NULL DEFAULT 'MINI';
