"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditSchemas = void 0;
exports.auditSchemas = {
    FileUploadResponse: {
        type: "object",
        properties: {
            uploadId: {
                type: "string",
                format: "uuid",
                example: "590cbfd1-a2f2-449b-8884-aa6deed3257d",
            },
            recordsAnalyzed: {
                type: "integer",
                example: 5,
            },
            threats: {
                type: "array",
                items: {
                    type: "object",
                },
                example: [],
            },
            summary: {
                type: "object",
                properties: {
                    totalRecords: {
                        type: "integer",
                        example: 5,
                    },
                    flagged: {
                        type: "integer",
                        example: 0,
                    },
                    flaggedValue: {
                        type: "integer",
                        example: 0,
                    },
                    message: {
                        type: "string",
                        example: "File uploaded successfully. 5 records queued for processing. Threats will be detected asynchronously.",
                    },
                },
            },
            processingAsync: {
                type: "boolean",
                example: true,
            },
        },
    },
    Alert: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "150e19a7-1c62-4fc3-ba2a-0c6b41f5ac5a",
            },
            companyId: {
                type: "string",
                format: "uuid",
                example: "a0b49a62-3a08-4e84-b126-134da675e048",
            },
            recordId: {
                type: "string",
                format: "uuid",
                example: "ff86400f-9c21-4d56-a02a-fd5af83d4ef7",
            },
            threatId: {
                type: "string",
                format: "uuid",
                example: "4458fb36-20c0-4158-a2be-f9adf04bd992",
            },
            severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
                example: "high",
            },
            title: {
                type: "string",
                example: "DUP IN DB  TXID",
            },
            summary: {
                type: "string",
                example: "Transaction ID TX1011 matches 1 previous records. Cluster value: N/A.",
            },
            payload: {
                type: "object",
                properties: {
                    clusterKey: {
                        type: "string",
                        example: "dbtx:TX1011:ff86400f-9c21-4d56-a02a-fd5af83d4ef7",
                    },
                    context: {
                        type: "object",
                        properties: {
                            companyId: {
                                type: "string",
                                format: "uuid",
                                example: "a0b49a62-3a08-4e84-b126-134da675e048",
                            },
                            confidenceScore: {
                                type: "number",
                                example: 0.98,
                            },
                            createdAt: {
                                type: "string",
                                format: "date-time",
                                example: "2025-08-29T00:43:27.302Z",
                            },
                            description: {
                                type: "string",
                                example: "Transaction ID TX1011 matches 1 previous records. Cluster value: N/A.",
                            },
                            id: {
                                type: "string",
                                format: "uuid",
                                example: "4458fb36-20c0-4158-a2be-f9adf04bd992",
                            },
                            metadata: {
                                type: "object",
                                properties: {
                                    aiContext: {
                                        type: "object",
                                        properties: {
                                            additionalContext: {
                                                type: "object",
                                                properties: {
                                                    flaggedRecordIds: {
                                                        type: "array",
                                                        items: {
                                                            type: "string",
                                                            format: "uuid",
                                                        },
                                                    },
                                                    priorCount: {
                                                        type: "integer",
                                                        example: 1,
                                                    },
                                                    priorIds: {
                                                        type: "array",
                                                        items: {
                                                            type: "string",
                                                            format: "uuid",
                                                        },
                                                    },
                                                    scope: {
                                                        type: "string",
                                                        example: "db_prior_same_txid",
                                                    },
                                                },
                                            },
                                            amount: {
                                                type: "number",
                                                example: 100,
                                            },
                                            datasetStats: {
                                                type: "object",
                                                properties: {
                                                    max: {
                                                        type: "number",
                                                        example: 640,
                                                    },
                                                    mean: {
                                                        type: "number",
                                                        example: 268,
                                                    },
                                                    totalRecords: {
                                                        type: "integer",
                                                        example: 5,
                                                    },
                                                },
                                            },
                                            partner: {
                                                type: "string",
                                                example: "PartnerF",
                                            },
                                            threatType: {
                                                type: "string",
                                                example: "DUP_IN_DB__TXID",
                                            },
                                            txId: {
                                                type: "string",
                                                example: "TX1011",
                                            },
                                        },
                                    },
                                },
                            },
                            recordId: {
                                type: "string",
                                format: "uuid",
                                example: "ff86400f-9c21-4d56-a02a-fd5af83d4ef7",
                            },
                            status: {
                                type: "string",
                                enum: ["open", "in_progress", "resolved", "false_positive"],
                                example: "open",
                            },
                            threatType: {
                                type: "string",
                                example: "DUP_IN_DB__TXID",
                            },
                            updatedAt: {
                                type: "string",
                                format: "date-time",
                                example: "2025-08-29T00:43:27.302Z",
                            },
                            uploadId: {
                                type: "string",
                                format: "uuid",
                                example: "efa788be-a350-44aa-af5a-d7deb544cbef",
                            },
                        },
                    },
                    ruleId: {
                        type: "string",
                        example: "DUP_IN_DB__TXID",
                    },
                },
            },
            delivered: {
                type: "boolean",
                example: false,
            },
            createdAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-29T00:43:28.564Z",
            },
            updatedAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-29T00:43:28.564Z",
            },
        },
    },
    Threat: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "fb95f0ea-124f-4848-b8d1-dd5552cca5b0",
            },
            companyId: {
                type: "string",
                format: "uuid",
                example: "a0b49a62-3a08-4e84-b126-134da675e048",
            },
            uploadId: {
                type: "string",
                format: "uuid",
                example: "efa788be-a350-44aa-af5a-d7deb544cbef",
            },
            recordId: {
                type: "string",
                format: "uuid",
                example: "f8b5b4a6-9a1e-41a7-8d05-d9fb96c82fc0",
            },
            threatType: {
                type: "string",
                enum: ["DUP_IN_DB__TXID", "OTHER_THREAT_TYPE"],
                example: "DUP_IN_DB__TXID",
            },
            description: {
                type: "string",
                example: "Transaction ID TX1012 matches 2 previous records. Cluster value: N/A.",
            },
            confidenceScore: {
                type: "number",
                example: 0.98,
            },
            status: {
                type: "string",
                enum: ["open", "in_progress", "resolved", "false_positive"],
                example: "open",
            },
            createdAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-29T00:43:23.443Z",
            },
            updatedAt: {
                type: "string",
                format: "date-time",
                example: "2025-08-29T00:43:23.443Z",
            },
            metadata: {
                type: "object",
                properties: {
                    aiContext: {
                        type: "object",
                        properties: {
                            additionalContext: {
                                type: "object",
                                properties: {
                                    flaggedRecordIds: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                            format: "uuid",
                                        },
                                    },
                                    priorCount: {
                                        type: "integer",
                                        example: 2,
                                    },
                                    priorIds: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                            format: "uuid",
                                        },
                                    },
                                    scope: {
                                        type: "string",
                                        example: "db_prior_same_txid",
                                    },
                                },
                            },
                            amount: {
                                type: "number",
                                example: 200,
                            },
                            datasetStats: {
                                type: "object",
                                properties: {
                                    max: {
                                        type: "number",
                                        example: 640,
                                    },
                                    mean: {
                                        type: "number",
                                        example: 268,
                                    },
                                    totalRecords: {
                                        type: "integer",
                                        example: 5,
                                    },
                                },
                            },
                            partner: {
                                type: "string",
                                example: "PartnerG",
                            },
                            threatType: {
                                type: "string",
                                example: "DUP_IN_DB__TXID",
                            },
                            txId: {
                                type: "string",
                                example: "TX1012",
                            },
                        },
                    },
                },
            },
            record: {
                type: "object",
                nullable: true,
                example: null,
            },
        },
    },
    ThreatAnalysis: {
        type: "object",
        properties: {
            threat: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        example: "4458fb36-20c0-4158-a2be-f9adf04bd992",
                    },
                    threatType: {
                        type: "string",
                        example: "DUP_IN_DB__TXID",
                    },
                    confidenceScore: {
                        type: "number",
                        example: 0.98,
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2025-08-29T00:43:27.302Z",
                    },
                    description: {
                        type: "string",
                        example: "Transaction ID TX1011 matches 1 previous records. Cluster value: N/A.",
                    },
                },
            },
            explanation: {
                type: "string",
                example: "A summary of the details of the transactions...",
            },
            record: {
                type: "object",
                nullable: true,
                example: null,
            },
            source: {
                type: "string",
                enum: ["generated", "manual"],
                example: "generated",
            },
        },
    },
};
