-- Normalize any existing vehicleType values to valid RideCategory enum values
UPDATE "Driver" SET "vehicleType" = 'MINI' WHERE "vehicleType" NOT IN ('MINI', 'RIDE_AC', 'PREMIUM');

-- AlterTable: change vehicleType from text to RideCategory enum
ALTER TABLE "Driver" ALTER COLUMN "vehicleType" TYPE "RideCategory" USING "vehicleType"::"RideCategory";
