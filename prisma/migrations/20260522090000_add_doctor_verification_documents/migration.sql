ALTER TABLE `User`
    MODIFY `role` ENUM('PATIENT', 'DOCTOR', 'ADMIN') NOT NULL;

CREATE TABLE `DoctorVerificationDocumentType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DoctorVerificationDocumentType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DoctorCertificate`
    ADD COLUMN `documentTypeId` VARCHAR(191) NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL;

CREATE INDEX `DoctorCertificate_documentTypeId_idx` ON `DoctorCertificate`(`documentTypeId`);
CREATE UNIQUE INDEX `DoctorCertificate_doctorProfileId_documentTypeId_key`
    ON `DoctorCertificate`(`doctorProfileId`, `documentTypeId`);

ALTER TABLE `DoctorCertificate`
    ADD CONSTRAINT `DoctorCertificate_documentTypeId_fkey`
    FOREIGN KEY (`documentTypeId`) REFERENCES `DoctorVerificationDocumentType`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
