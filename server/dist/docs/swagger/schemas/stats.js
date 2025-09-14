"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsSchemas = void 0;
exports.statsSchemas = {
    CompanyStatsResponse: {
        type: "object",
        properties: {
            success: {
                type: "boolean",
                example: true,
            },
            data: {
                type: "object",
                properties: {
                    totalFiles: {
                        type: "integer",
                        example: 2,
                        description: "Total number of files uploaded",
                    },
                    totalRecords: {
                        type: "integer",
                        example: 14,
                        description: "Total number of records processed",
                    },
                    totalFrauds: {
                        type: "integer",
                        example: 1,
                        description: "Total number of fraud threats detected",
                    },
                    totalUsers: {
                        type: "integer",
                        example: 1,
                        description: "Total number of users in the company",
                    },
                    totalFileSize: {
                        type: "integer",
                        example: 1057,
                        description: "Total size of all uploaded files in bytes",
                    },
                },
            },
            timestamp: {
                type: "string",
                format: "date-time",
                example: "2025-08-31T21:55:48.251Z",
                description: "Timestamp when the statistics were generated",
            },
        },
    },
};
