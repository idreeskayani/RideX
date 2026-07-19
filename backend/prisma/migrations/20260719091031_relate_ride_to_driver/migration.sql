-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_driverId_fkey";

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
