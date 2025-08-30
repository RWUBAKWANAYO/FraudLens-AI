"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookPaths = void 0;
exports.webhookPaths = {
    "/webhooks": {
        post: {
            summary: "Create webhook subscription",
            description: "Create a new webhook subscription for receiving events",
            tags: ["Webhooks"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/WebhookCreate",
                        },
                    },
                },
            },
            responses: {
                "201": {
                    description: "Webhook created successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Webhook",
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
            },
        },
        get: {
            summary: "List webhook subscriptions",
            description: "Retrieve all webhook subscriptions for a company",
            tags: ["Webhooks"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            parameters: [
                {
                    name: "companyId",
                    in: "query",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                        example: "a0b49a62-3a08-4e84-b126-134da675e048",
                    },
                    description: "Company identifier",
                },
            ],
            responses: {
                "200": {
                    description: "Webhooks retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    $ref: "#/components/schemas/Webhook",
                                },
                            },
                        },
                    },
                },
                "400": {
                    description: "Validation error",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ValidationError",
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
            },
        },
    },
    "/webhooks/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdParam" }],
        put: {
            summary: "Update webhook subscription",
            description: "Update an existing webhook subscription",
            tags: ["Webhooks"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/WebhookUpdate",
                        },
                    },
                },
            },
            responses: {
                "200": {
                    description: "Webhook updated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Webhook",
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
                "404": {
                    description: "Webhook not found",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Webhook not found",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        delete: {
            summary: "Delete webhook subscription",
            description: "Delete a webhook subscription",
            tags: ["Webhooks"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "Webhook deleted successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/WebhookDeleteResponse",
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
                "404": {
                    description: "Webhook not found",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Webhook not found",
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
