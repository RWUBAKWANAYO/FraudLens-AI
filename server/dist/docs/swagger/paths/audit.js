"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditPaths = void 0;
exports.auditPaths = {
    "/audit/upload": {
        post: {
            summary: "Upload file or data for analysis",
            description: "Upload a file or send data directly for security analysis and threat detection. Use the 'Try it out' button and select the desired content type from the dropdown.",
            tags: ["Audit"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: {
                            type: "object",
                            properties: {
                                file: {
                                    type: "string",
                                    format: "binary",
                                    description: "File to upload for analysis (CSV, JSON, XLSX)",
                                },
                            },
                            required: ["file"],
                        },
                    },
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/DataUploadRequest",
                        },
                        examples: {
                            basicTransaction: {
                                summary: "Basic transaction data",
                                value: {
                                    data: {
                                        txId: "463dghjd4637s4647a587685",
                                        partner: "John Wayne",
                                        amount: 4000,
                                        date: "2025-09-01",
                                        currency: "USD",
                                    },
                                },
                            },
                            fullTransaction: {
                                summary: "Full transaction with optional fields",
                                value: {
                                    data: {
                                        txId: "463dghjd4637s4647a587685",
                                        partner: "John Wayne",
                                        amount: 4000,
                                        date: "2025-09-01",
                                        currency: "USD",
                                        ip: "192.168.1.1",
                                        device: "Chrome Browser",
                                        geoCountry: "US",
                                        geoCity: "New York",
                                        mcc: "5942",
                                        channel: "web",
                                    },
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": {
                    description: "File or data uploaded successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/FileUploadResponse",
                            },
                            examples: {
                                fileUpload: {
                                    summary: "File upload response",
                                    value: {
                                        uploadId: "590cbfd1-a2f2-449b-8884-aa6deed3257d",
                                        recordsAnalyzed: 5,
                                        threats: [],
                                        summary: {
                                            totalRecords: 5,
                                            flagged: 0,
                                            flaggedValue: 0,
                                            message: "File uploaded successfully. 5 records queued for processing. Threats will be detected asynchronously.",
                                        },
                                        processingAsync: true,
                                    },
                                },
                                dataUpload: {
                                    summary: "Data upload response",
                                    value: {
                                        uploadId: "2de228b2-f7db-4da7-a83f-03e0cb050e3e",
                                        recordsAnalyzed: 1,
                                        threats: [],
                                        summary: {
                                            totalRecords: 1,
                                            flagged: 0,
                                            flaggedValue: 0,
                                        },
                                        processingAsync: true,
                                    },
                                },
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
                "413": {
                    description: "File too large",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error",
                            },
                        },
                    },
                },
            },
        },
        get: {
            summary: "Get upload history",
            description: "Retrieve history of file uploads with filtering and pagination options",
            tags: ["Audit"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            parameters: [
                { $ref: "#/components/parameters/PageParam" },
                { $ref: "#/components/parameters/LimitParam" },
                { $ref: "#/components/parameters/FileStatusParam" },
                { $ref: "#/components/parameters/FileTypeParam" },
                { $ref: "#/components/parameters/FileNameParam" },
                { $ref: "#/components/parameters/SortByParam" },
                { $ref: "#/components/parameters/SortOrderParam" },
            ],
            responses: {
                "200": {
                    description: "Upload history retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/UploadHistoryResponse",
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
    },
    "/audit/download/{uploadId}": {
        parameters: [{ $ref: "#/components/parameters/UploadIdParam" }],
        get: {
            summary: "Download uploaded file",
            description: "Download the original uploaded file by upload ID",
            tags: ["Audit"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            parameters: [
                {
                    name: "format",
                    in: "query",
                    required: false,
                    schema: {
                        type: "string",
                        enum: ["csv", "json", "xlsx"],
                        default: "csv",
                    },
                    description: "Download format",
                },
            ],
            responses: {
                "200": {
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
                    description: "Upload not found",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "Upload not found",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/audit/alerts": {
        get: {
            summary: "Get threat alerts",
            description: "Retrieve security alerts with filtering, sorting, searching, and pagination options",
            tags: ["Audit"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            parameters: [
                { $ref: "#/components/parameters/PageParam" },
                { $ref: "#/components/parameters/LimitParam" },
                { $ref: "#/components/parameters/AlertStatusParam" },
                { $ref: "#/components/parameters/SeverityParam" },
                { $ref: "#/components/parameters/ThreatTypeParam" },
                { $ref: "#/components/parameters/RecordIdParam" },
                { $ref: "#/components/parameters/UploadIdParam" },
                { $ref: "#/components/parameters/SearchParam" },
                { $ref: "#/components/parameters/SortByParam" },
                { $ref: "#/components/parameters/SortOrderParam" },
            ],
            responses: {
                "200": {
                    description: "Alerts retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/AlertsListResponse",
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
    },
    "/audit/threats": {
        get: {
            summary: "Get detected threats",
            description: "Retrieve detected threats with filtering, sorting, searching, and pagination options",
            tags: ["Audit"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            parameters: [
                { $ref: "#/components/parameters/PageParam" },
                { $ref: "#/components/parameters/LimitParam" },
                { $ref: "#/components/parameters/ThreatStatusParam" },
                { $ref: "#/components/parameters/SeverityParam" },
                { $ref: "#/components/parameters/ThreatTypeParam" },
                { $ref: "#/components/parameters/RecordIdParam" },
                { $ref: "#/components/parameters/UploadIdParam" },
                { $ref: "#/components/parameters/SearchParam" },
                { $ref: "#/components/parameters/SortByParam" },
                { $ref: "#/components/parameters/SortOrderParam" },
            ],
            responses: {
                "200": {
                    description: "Threats retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ThreatsListResponse",
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
    },
    "/audit/threats/{threatId}/analysis": {
        parameters: [{ $ref: "#/components/parameters/ThreatIdParam" }],
        get: {
            summary: "Get threat analysis details",
            description: "Retrieve detailed analysis of a specific threat",
            tags: ["Audit"],
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
            responses: {
                "200": {
                    description: "Threat analysis retrieved",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ThreatAnalysis",
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
                    $ref: "#/components/responses/NotFound",
                },
            },
        },
    },
};
