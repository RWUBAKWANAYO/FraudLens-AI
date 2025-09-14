"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookSchemas = void 0;
exports.webhookSchemas = {
    Webhook: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "51a19664-088e-4cb1-9887-b9c40ed86f09",
            },
            companyId: {
                type: "string",
                format: "uuid",
                example: "a0b49a62-3a08-4e84-b126-134da675e048",
            },
            url: {
                type: "string",
                format: "uri",
                example: "https://hooks.slack.com/services/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",
            },
            secret: {
                type: "string",
                example: "49c005dcabd4ab7626e4cbb80ded3a78",
                description: "Webhook secret for signature verification",
            },
            events: {
                type: "array",
                items: {
                    type: "string",
                    enum: ["threat.created", "upload.complete", "alert.created", "scan.completed"],
                },
                example: ["threat.created", "upload.complete"],
            },
            active: {
                type: "boolean",
                example: true,
            },
            createdAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-29T00:28:28.806Z",
            },
            updatedAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-29T00:28:28.806Z",
            },
            deliveries: {
                type: "array",
                items: {
                    type: "object",
                    description: "Webhook delivery attempts",
                },
                example: [],
            },
        },
    },
    WebhookCreate: {
        type: "object",
        required: ["url", "events", "secret"],
        properties: {
            url: {
                type: "string",
                format: "uri",
                example: "https://hooks.slack.com/services/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",
            },
            events: {
                type: "array",
                items: {
                    type: "string",
                    enum: ["threat.created", "upload.complete", "alert.created", "scan.completed"],
                },
                example: ["threat.created", "upload.complete"],
            },
            secret: {
                type: "string",
                example: "435ssn4dcabd4ab7626gdhdssj342",
                description: "Webhook secret for signature verification",
            },
        },
    },
    WebhookUpdate: {
        type: "object",
        properties: {
            url: {
                type: "string",
                format: "uri",
                example: "https://hooks.slack.com/services/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",
            },
            secret: {
                type: "string",
                example: "435ssn4dcabd4ab7626gdhdssj342",
                description: "Webhook secret for signature verification",
            },
            events: {
                type: "array",
                items: {
                    type: "string",
                    enum: ["threat.created", "upload.complete", "alert.created", "scan.completed"],
                },
                example: ["threat.created", "upload.complete"],
            },
            active: {
                type: "boolean",
                example: true,
            },
        },
    },
    WebhookDeleteResponse: {
        type: "object",
        properties: {
            success: {
                type: "boolean",
                example: true,
            },
            message: {
                type: "string",
                example: "Webhook deleted successfully",
            },
        },
    },
};
