/*
  Warnings:

  - A unique constraint covering the columns `[endorsement_name]` on the table `Endorsement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restriction_name]` on the table `Endorsement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `endTime` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME NOT NULL,
    "restaurantId" TEXT NOT NULL,
    CONSTRAINT "Reservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("id", "restaurantId", "startTime") SELECT "id", "restaurantId", "startTime" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Endorsement_endorsement_name_key" ON "Endorsement"("endorsement_name");

-- CreateIndex
CREATE UNIQUE INDEX "Endorsement_restriction_name_key" ON "Endorsement"("restriction_name");
