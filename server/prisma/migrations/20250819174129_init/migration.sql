/*
  Warnings:

  - You are about to drop the column `employeeId` on the `Threat` table. All the data in the column will be lost.
  - You are about to drop the `Communications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinancialLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WarRoomReport` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Threat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadId` to the `Threat` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Communications` DROP FOREIGN KEY `Communications_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `FinancialLog` DROP FOREIGN KEY `FinancialLog_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `Threat` DROP FOREIGN KEY `Threat_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `WarRoomReport` DROP FOREIGN KEY `WarRoomReport_threatId_fkey`;

-- DropIndex
DROP INDEX `Threat_employeeId_status_createdAt_idx` ON `Threat`;

-- AlterTable
ALTER TABLE `Threat` DROP COLUMN `employeeId`,
    ADD COLUMN `recordId` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `uploadId` VARCHAR(191) NOT NULL,
    ALTER COLUMN `confidenceScore` DROP DEFAULT;

-- DropTable
DROP TABLE `Communications`;

-- DropTable
DROP TABLE `Employee`;

-- DropTable
DROP TABLE `FinancialLog`;

-- DropTable
DROP TABLE `WarRoomReport`;

-- CreateTable
CREATE TABLE `Upload` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Record` (
    `id` VARCHAR(191) NOT NULL,
    `uploadId` VARCHAR(191) NOT NULL,
    `txId` VARCHAR(191) NULL,
    `partner` VARCHAR(191) NULL,
    `amount` DOUBLE NULL,
    `date` DATETIME(3) NULL,
    `raw` JSON NULL,
    `embeddingJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Record_uploadId_idx`(`uploadId`),
    INDEX `Record_partner_idx`(`partner`),
    INDEX `Record_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Threat_uploadId_status_createdAt_idx` ON `Threat`(`uploadId`, `status`, `createdAt`);

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_uploadId_fkey` FOREIGN KEY (`uploadId`) REFERENCES `Upload`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Threat` ADD CONSTRAINT `Threat_uploadId_fkey` FOREIGN KEY (`uploadId`) REFERENCES `Upload`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Threat` ADD CONSTRAINT `Threat_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `Record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
