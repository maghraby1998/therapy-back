-- AlterTable
ALTER TABLE `PatientProfile` ADD COLUMN `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `nickname` VARCHAR(191) NULL;
