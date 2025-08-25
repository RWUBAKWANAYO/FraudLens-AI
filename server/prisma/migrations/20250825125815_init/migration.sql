-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_slug_key`(`slug`),
    INDEX `Company_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'ANALYST', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationToken` VARCHAR(191) NULL,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `invitedById` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_companyId_email_idx`(`companyId`, `email`),
    INDEX `User_verificationToken_idx`(`verificationToken`),
    INDEX `User_resetToken_idx`(`resetToken`),
    INDEX `User_invitedById_idx`(`invitedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invitation` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `invitedById` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'ANALYST', 'MEMBER') NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `accepted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invitation_token_key`(`token`),
    INDEX `Invitation_companyId_email_idx`(`companyId`, `email`),
    INDEX `Invitation_token_idx`(`token`),
    INDEX `Invitation_expiresAt_idx`(`expiresAt`),
    INDEX `Invitation_invitedById_idx`(`invitedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Upload` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'batch',
    `fileHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Upload_companyId_fileHash_createdAt_idx`(`companyId`, `fileHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Record` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `uploadId` VARCHAR(191) NOT NULL,
    `txId` VARCHAR(191) NULL,
    `partner` VARCHAR(256) NULL,
    `amount` DOUBLE NULL,
    `currency` VARCHAR(12) NULL,
    `date` DATETIME(3) NULL,
    `ip` VARCHAR(64) NULL,
    `device` VARCHAR(128) NULL,
    `geoCountry` VARCHAR(8) NULL,
    `geoCity` VARCHAR(128) NULL,
    `mcc` VARCHAR(8) NULL,
    `channel` VARCHAR(32) NULL,
    `raw` JSON NULL,
    `embeddingJson` JSON NULL,
    `embeddingVec` vector(384) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `normalizedPartner` VARCHAR(191) NULL,
    `normalizedCurrency` VARCHAR(191) NULL,
    `userKey` VARCHAR(191) NULL,
    `accountKey` VARCHAR(191) NULL,
    `accountMasked` VARCHAR(191) NULL,
    `timeBucket30s` INTEGER NULL,
    `timeBucket60s` INTEGER NULL,
    `canonicalKey` VARCHAR(191) NULL,
    `recordSignature` VARCHAR(191) NULL,

    INDEX `Record_companyId_txId_idx`(`companyId`, `txId`),
    INDEX `Record_companyId_canonicalKey_idx`(`companyId`, `canonicalKey`),
    INDEX `Record_companyId_userKey_timeBucket30s_idx`(`companyId`, `userKey`, `timeBucket30s`),
    INDEX `Record_companyId_createdAt_idx`(`companyId`, `createdAt`),
    INDEX `Record_companyId_accountKey_idx`(`companyId`, `accountKey`),
    INDEX `Record_uploadId_idx`(`uploadId`),
    INDEX `idx_company_txid_full`(`companyId`, `txId`, `normalizedPartner`, `amount`, `normalizedCurrency`, `date`),
    INDEX `idx_company_strict_tuple`(`companyId`, `normalizedPartner`, `amount`, `normalizedCurrency`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Threat` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `uploadId` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NULL,
    `threatType` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `confidenceScore` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `metadata` JSON NULL,

    INDEX `Threat_companyId_status_createdAt_idx`(`companyId`, `status`, `createdAt`),
    INDEX `Threat_recordId_fkey`(`recordId`),
    INDEX `Threat_uploadId_fkey`(`uploadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alert` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NULL,
    `threatId` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `payload` JSON NULL,
    `delivered` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Alert_companyId_createdAt_idx`(`companyId`, `createdAt`),
    INDEX `Alert_recordId_fkey`(`recordId`),
    INDEX `Alert_threatId_fkey`(`threatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `events` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebhookSubscription_companyId_active_idx`(`companyId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `webhookId` VARCHAR(191) NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `success` BOOLEAN NOT NULL,
    `attempt` INTEGER NOT NULL,
    `error` VARCHAR(191) NULL,
    `responseTime` INTEGER NULL,
    `environment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookDelivery_webhookId_createdAt_idx`(`webhookId`, `createdAt`),
    INDEX `WebhookDelivery_success_environment_idx`(`success`, `environment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rule` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `definition` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Rule_companyId_fkey`(`companyId`),
    INDEX `Rule_companyId_priority_idx`(`companyId`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
