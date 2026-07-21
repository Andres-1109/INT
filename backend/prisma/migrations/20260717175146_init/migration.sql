-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "SpaceCategory" AS ENUM ('private_office', 'meeting_room', 'coworking', 'creative_space', 'rehearsal_room');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('pending_approval', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending_approval', 'confirmed', 'rejected', 'cancelled_by_guest', 'cancelled_by_host', 'completed');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('host_penalty', 'guest_compensation');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationalId" TEXT,
    "nationalIdDocUrl" TEXT,
    "bankCertificateUrl" TEXT,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'user',
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "freeBookingsUsed" INTEGER NOT NULL DEFAULT 0,
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "acceptedDataPolicy" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SpaceCategory" NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "pricePerHour" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'pending_approval',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_photos" (
    "id" SERIAL NOT NULL,
    "spaceId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "space_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_amenity" (
    "spaceId" INTEGER NOT NULL,
    "amenityId" INTEGER NOT NULL,

    CONSTRAINT "space_amenity_pkey" PRIMARY KEY ("spaceId","amenityId")
);

-- CreateTable
CREATE TABLE "space_blocks" (
    "id" SERIAL NOT NULL,
    "spaceId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "spaceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "guestFee" DECIMAL(10,2) NOT NULL,
    "guestFeeTax" DECIMAL(10,2) NOT NULL,
    "hostFee" DECIMAL(10,2) NOT NULL,
    "hostFeeTax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "hostNet" DECIMAL(10,2) NOT NULL,
    "usedFreeBooking" BOOLEAN NOT NULL DEFAULT false,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending_approval',
    "responseDeadline" TIMESTAMP(3) NOT NULL,
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_penalties" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "type" "PenaltyType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nationalId_key" ON "users"("nationalId");

-- CreateIndex
CREATE INDEX "spaces_city_idx" ON "spaces"("city");

-- CreateIndex
CREATE INDEX "spaces_type_idx" ON "spaces"("type");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "space_blocks_spaceId_startDate_endDate_idx" ON "space_blocks"("spaceId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "bookings_spaceId_date_idx" ON "bookings"("spaceId", "date");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_photos" ADD CONSTRAINT "space_photos_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_amenity" ADD CONSTRAINT "space_amenity_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_amenity" ADD CONSTRAINT "space_amenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_blocks" ADD CONSTRAINT "space_blocks_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_penalties" ADD CONSTRAINT "booking_penalties_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
