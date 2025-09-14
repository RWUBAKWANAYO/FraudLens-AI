"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsResponses = void 0;
exports.statsResponses = {
    CompanyStatsSuccess: {
        description: "Company statistics retrieved successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/CompanyStatsResponse",
                },
            },
        },
    },
};
