-- AlterTable
ALTER TABLE `Session` ADD COLUMN `roomName` VARCHAR(191) NULL,
    ADD UNIQUE INDEX `Session_roomName_key`(`roomName`);
