"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeySchemas = void 0;
exports.apiKeySchemas = {
    ApiKey: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "1c14ece0-c700-4a92-8aa5-0b642a2963a9",
            },
            name: {
                type: "string",
                example: "Production API Key",
            },
            key: {
                type: "string",
                example: "ak_0383ebcfa6274bc5bc1893a8ad2fcac7",
                description: "API key identifier (prefix + unique ID)",
            },
            secret: {
                type: "string",
                example: "b2477081435a4ad094a7def2206a6a35",
                description: "API secret (only shown on creation or rotation)",
            },
            enabled: {
                type: "boolean",
                example: true,
            },
            expiresAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            lastUsedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: "2025-08-30T07:16:09.854Z",
            },
            createdAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-30T07:10:21.836Z",
            },
        },
    },
    ApiKeyCreate: {
        type: "object",
        required: ["name"],
        properties: {
            name: {
                type: "string",
                example: "Production API Key",
            },
            expiresAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                description: "Optional expiration date",
                example: null,
            },
        },
    },
    ApiKeyCreateResponse: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "1c14ece0-c700-4a92-8aa5-0b642a2963a9",
            },
            key: {
                type: "string",
                example: "ak_0383ebcfa6274bc5bc1893a8ad2fcac7",
            },
            secret: {
                type: "string",
                example: "b2477081435a4ad094a7def2206a6a35",
            },
            name: {
                type: "string",
                example: "Production API Key",
            },
            expiresAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            createdAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-30T07:10:21.836Z",
            },
            enabled: {
                type: "boolean",
                example: true,
            },
        },
    },
    ApiKeyRevokeResponse: {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "API key revoked successfully",
            },
            revokedAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-30T07:31:06.742Z",
            },
        },
    },
    ApiKeyReactivateResponse: {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "API key reactivated successfully",
            },
            reactivatedAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-28T22:22:59.855Z",
            },
        },
    },
    ApiKeyRotateResponse: {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "API key secret rotated successfully",
            },
            secret: {
                type: "string",
                example: "0bb0308d0b47441da9d2eae39683d372",
            },
            rotatedAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-28T22:58:21.074Z",
            },
        },
    },
    ApiKeyDeleteResponse: {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "API key permanently deleted successfully",
            },
            deletedAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-30T07:45:53.300Z",
            },
        },
    },
};
