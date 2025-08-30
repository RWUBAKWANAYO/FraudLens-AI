"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookResponses = void 0;
exports.webhookResponses = {
    WebhookCreated: {
        description: "Webhook created successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/Webhook",
                },
            },
        },
    },
    WebhookListSuccess: {
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
    WebhookUpdated: {
        description: "Webhook updated successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/Webhook",
                },
            },
        },
    },
    WebhookDeleted: {
        description: "Webhook deleted successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/WebhookDeleteResponse",
                },
            },
        },
    },
};
