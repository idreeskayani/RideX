-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_driverId_fkey";

-- AlterTable
ALTER TABLE "Ride" ALTER COLUMN "fare" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
