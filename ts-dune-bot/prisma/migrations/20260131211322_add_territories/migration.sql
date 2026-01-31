-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "actionsChannelId" TEXT NOT NULL,
    "mapChannelId" TEXT NOT NULL,
    "tableTalkChannelId" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TreacheryCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isWeapon" BOOLEAN NOT NULL,
    "isDefense" BOOLEAN NOT NULL,
    "isSpecial" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "SpiceCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER,
    "sector" INTEGER
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sector" INTEGER NOT NULL,
    "isSafe" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "TreacheryCard_name_key" ON "TreacheryCard"("name");

-- CreateIndex
CREATE INDEX "TreacheryCard_type_idx" ON "TreacheryCard"("type");

-- CreateIndex
CREATE UNIQUE INDEX "SpiceCard_name_key" ON "SpiceCard"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Territory_name_key" ON "Territory"("name");

-- CreateIndex
CREATE INDEX "Territory_sector_idx" ON "Territory"("sector");

-- CreateIndex
CREATE INDEX "Territory_isSafe_idx" ON "Territory"("isSafe");
