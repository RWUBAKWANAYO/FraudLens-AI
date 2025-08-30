"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonSchemas = void 0;
exports.commonSchemas = {
    Error: {
        type: "object",
        properties: {
            error: {
                type: "string",
                description: "Error message",
                example: "Invalid credentials",
            },
            code: {
                type: "string",
                description: "Error code",
                example: "INVALID_CREDENTIALS",
            },
            details: {
                type: "object",
                description: "Additional error details",
            },
            stack: {
                type: "string",
                description: "Stack trace (development only)",
            },
        },
    },
    ValidationError: {
        type: "object",
        properties: {
            errors: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            example: "field",
                        },
                        value: {
                            type: "string",
                            example: "humblenayo@gma",
                        },
                        msg: {
                            type: "string",
                            example: "Valid email is required",
                        },
                        path: {
                            type: "string",
                            example: "email",
                        },
                        location: {
                            type: "string",
                            example: "body",
                        },
                    },
                },
            },
        },
    },
    Pagination: {
        type: "object",
        properties: {
            page: {
                type: "integer",
                example: 1,
            },
            limit: {
                type: "integer",
                example: 20,
            },
            total: {
                type: "integer",
                example: 100,
            },
            pages: {
                type: "integer",
                example: 5,
            },
            hasNext: {
                type: "boolean",
                example: true,
            },
            hasPrev: {
                type: "boolean",
                example: false,
            },
        },
    },
};
