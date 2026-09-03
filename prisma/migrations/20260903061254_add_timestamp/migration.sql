/*
  Warnings:

  - Added the required column `updatedAt` to the `user_units` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_units` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `createdBy` VARCHAR(36) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `updatedBy` VARCHAR(36) NULL;
