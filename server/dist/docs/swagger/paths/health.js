"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthPaths = void 0;
exports.healthPaths = {
    "/health": {
        get: {
            summary: "Health check",
            description: "Check if the API is running",
            tags: ["System"],
            responses: {
                "200": {
                    description: "API is healthy",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    status: {
                                        type: "string",
                                        example: "OK",
                                    },
                                    timestamp: {
                                        type: "string",
                                        format: "date-time",
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
