"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsPaths = void 0;
exports.statsPaths = {
    "/stats/company": {
        get: {
            summary: "Get company statistics",
            description: "Retrieve overall statistics for the company including files, records, frauds, users, and file size",
            tags: ["Statistics"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "Company statistics retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/CompanyStatsResponse",
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
};
