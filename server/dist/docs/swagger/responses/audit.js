"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditResponses = void 0;
exports.auditResponses = {
    FileUploadSuccess: {
        description: "File or data uploaded successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/FileUploadResponse",
                },
            },
        },
    },
    UploadHistorySuccess: {
        description: "Upload history retrieved successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/UploadHistoryResponse",
                },
            },
        },
    },
    DownloadSuccess: {
        description: "File downloaded successfully",
        content: {
            "text/csv": {
                schema: {
                    type: "string",
                    example: "txId,partner,amount,currency,date,ip,device,geoCountry,geoCity,mcc,channel\nTX1001,Amazon,149.99,USD,2023-05-15,192.168.1.1,Chrome Browser,US,Seattle,5942,web",
                },
            },
            "application/json": {
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                    },
                },
            },
            xlsx: {
                schema: {
                    type: "string",
                    format: "binary",
                },
            },
        },
    },
    AlertsListSuccess: {
        description: "Alerts retrieved successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/AlertsListResponse",
                },
            },
        },
    },
    ThreatsListSuccess: {
        description: "Threats retrieved successfully",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/ThreatsListResponse",
                },
            },
        },
    },
    ThreatAnalysisSuccess: {
        description: "Threat analysis retrieved",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/ThreatAnalysis",
                },
            },
        },
    },
};
