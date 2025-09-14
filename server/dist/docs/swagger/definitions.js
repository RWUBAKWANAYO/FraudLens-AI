"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerDefinition = void 0;
exports.swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Security Scanner API",
        version: "1.0.0",
        description: "Comprehensive API for file security scanning, direct data analysis, threat detection, and management. Supports both file uploads and direct JSON data submission.",
        contact: {
            name: "API Support",
            email: "support@example.com",
        },
        license: {
            name: "MIT",
            url: "https://spdx.org/licenses/MIT.html",
        },
    },
    tags: [
        {
            name: "Authentication",
            description: "User authentication and authorization endpoints",
        },
        {
            name: "Users",
            description: "User management endpoints",
        },
        {
            name: "API Keys",
            description: "API key management endpoints",
        },
        {
            name: "Webhooks",
            description: "Webhook management endpoints",
        },
        {
            name: "Audit",
            description: "File scanning, threat detection, and security audit endpoints",
        },
        {
            name: "Statistics",
            description: "Company statistics and analytics endpoints",
        },
        {
            name: "System",
            description: "System health and status endpoints",
        },
    ],
    servers: [
        {
            url: process.env.API_BASE_URL || "http://localhost:8080/api/v1",
            description: process.env.NODE_ENV || "development",
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token obtained from /auth/login endpoint",
            },
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "Authorization",
                description: "API key in format 'Bearer APIKey {key}:{secret}'",
            },
        },
    },
    security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
};
