-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "latitude" TEXT,
    "longitude" TEXT
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Endorsement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endorsement_name" TEXT NOT NULL,
    "restriction_name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capacity" INTEGER NOT NULL,
    "restaurantId" TEXT,
    CONSTRAINT "Table_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT,
    CONSTRAINT "Reservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_EndorsementToRestaurant" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EndorsementToRestaurant_A_fkey" FOREIGN KEY ("A") REFERENCES "Endorsement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EndorsementToRestaurant_B_fkey" FOREIGN KEY ("B") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_EndorsementToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EndorsementToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Endorsement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EndorsementToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ReservationToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ReservationToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ReservationToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_EndorsementToRestaurant_AB_unique" ON "_EndorsementToRestaurant"("A", "B");

-- CreateIndex
CREATE INDEX "_EndorsementToRestaurant_B_index" ON "_EndorsementToRestaurant"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EndorsementToUser_AB_unique" ON "_EndorsementToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_EndorsementToUser_B_index" ON "_EndorsementToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ReservationToUser_AB_unique" ON "_ReservationToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ReservationToUser_B_index" ON "_ReservationToUser"("B");
