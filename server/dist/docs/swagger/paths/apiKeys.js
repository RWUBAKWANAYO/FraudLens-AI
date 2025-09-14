"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyPaths = void 0;
exports.apiKeyPaths = {
    "/api-keys": {
        post: {
            summary: "Create API key",
            description: "Create a new API key. Requires ADMIN or MANAGER role.",
            tags: ["API Keys"],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ApiKeyCreate",
                        },
                    },
                },
            },
            responses: {
                "201": {
                    description: "API key created successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ApiKeyCreateResponse",
                            },
                        },
                    },
                },
                "400": {
                    $ref: "#/components/responses/BadRequest",
                },
                "401": {
                    description: "Invalid token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Invalid token",
                                    },
                                },
                            },
                        },
                    },
                },
                "403": {
                    $ref: "#/components/responses/Forbidden",
                },
            },
        },
        get: {
            summary: "List API keys",
            description: "Retrieve all API keys for the current user's company. Requires ADMIN or MANAGER role.",
            tags: ["API Keys"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "API keys retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    $ref: "#/components/schemas/ApiKey",
                                },
                            },
                        },
                    },
                },
                "401": {
                    description: "Invalid token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Invalid token",
                                    },
                                },
                            },
                        },
                    },
                },
                "403": {
                    $ref: "#/components/responses/Forbidden",
                },
            },
        },
    },
    "/api-keys/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdParam" }],
        get: {
            summary: "Get API key details",
            description: "Retrieve detailed information about a specific API key. Requires ADMIN or MANAGER role.",
            tags: ["API Keys"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "API key details retrieved",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ApiKey",
                            },
                        },
                    },
                },
                "401": {
                    description: "Invalid token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Invalid token",
                                    },
                                },
                            },
                        },
                    },
                },
                "403": {
                    $ref: "#/components/responses/Forbidden",
                },
                "404": {
                    $ref: "#/components/responses/NotFound",
                },
            },
        },
        delete: {
            summary: "Delete API key",
            description: "Permanently delete an API key. Requires ADMIN or MANAGER role.",
            tags: ["API Keys"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "API key deleted successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ApiKeyDeleteResponse",
                            },
                        },
                    },
                },
                "401": {
                    description: "Invalid token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Invalid token",
                                    },
                                },
                            },
                        },
                    },
                },
                "403": {
                    $ref: "#/components/responses/Forbidden",
                },
                "404": {
                    description: "API key not found",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "API key not found",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/api-keys/{id}/revoke": {
        parameters: [{ $ref: "#/components/parameters/IdParam" }],
        patch: {
            summary: "Revoke API key",
            description: "Revoke an API key (disable it). Requires ADMIN or MANAGER role.",
            tags: ["API Keys"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "API key revoked successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ApiKeyRevokeResponse",
                            },
                        },
                    },
                },
                "401": {
                    description: "Invalid token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Invalid token",
                                    },
                                },
                            },
                        },
                    },
                },
                "403": {
                    $ref: "#/components/responses/Forbidden",
                },
                "404": {
                    description: "API key not found or already revoked",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "API key not found or already revoked",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/api-keys/{id}/reactivate": {
        parameters: [{ $ref: "#/components/parameters/IdParam" }],
        patch: {
            summary: "Reactivate API key",
            description: "Reactivate a revoked API key. Requires ADMIN or MANAGER role.",
            tags: ["API Keys"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "API key reactivated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ApiKeyReactivateResponse",
                            },
                        },
                    },
                },
                "401": {
                    description: "Invalid token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Invalid token",
                                    },
                                },
                            },
                        },
                    },
                },
                "403": {
                    $ref: "#/components/responses/Forbidden",
                },
                "404": {
                    description: "API key not found or already active",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "API key not found or already active",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/api-keys/{id}/rotate-secret": {
        parameters: [{ $ref: "#/components/parameters/IdParam" }],
        patch: {
            summary: "Rotate API key secret",
            description: "Rotate the secret for an API key (generates new secret). Requires ADMIN or MANAGER role.",
            tags: ["API Keys"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "API key secret rotated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ApiKeyRotateResponse",
                            },
                        },
                    },
                },
                "401": {
                    description: "Invalid token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Invalid token",
                                    },
                                },
                            },
                        },
                    },
                },
                "403": {
                    $ref: "#/components/responses/Forbidden",
                },
                "404": {
                    description: "API key not found",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "API key not found",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
