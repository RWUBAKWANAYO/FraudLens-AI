"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditParameters = void 0;
exports.auditParameters = {
    ThreatIdParam: {
        name: "threatId",
        in: "path",
        required: true,
        schema: {
            type: "string",
            format: "uuid",
            example: "4458fb36-20c0-4158-a2be-f9adf04bd992",
        },
        description: "Threat identifier",
    },
    UploadIdParam: {
        name: "uploadId",
        in: "path",
        required: true,
        schema: {
            type: "string",
            format: "uuid",
            example: "ec45f4f5-165c-40ac-8c57-6a903aceb063",
        },
        description: "Upload identifier",
    },
    AlertStatusParam: {
        name: "status",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: ["open", "in_progress", "resolved", "false_positive"],
        },
        description: "Filter alerts by status",
    },
    ThreatStatusParam: {
        name: "status",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: ["open", "in_progress", "resolved", "false_positive"],
        },
        description: "Filter threats by status",
    },
    FileStatusParam: {
        name: "status",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: ["pending", "processing", "completed", "failed"],
        },
        description: "Filter uploads by status",
    },
    SeverityParam: {
        name: "severity",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
        },
        description: "Filter by severity level",
    },
    ThreatTypeParam: {
        name: "threatType",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: ["DUP_IN_DB__TXID", "OTHER_THREAT_TYPE"],
        },
        description: "Filter by threat type",
    },
    FileTypeParam: {
        name: "fileType",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: ["text/csv", "application/json", "xlsx"],
        },
        description: "Filter by file type",
    },
    FileNameParam: {
        name: "fileName",
        in: "query",
        required: false,
        schema: {
            type: "string",
            example: "transactions.csv",
        },
        description: "Filter by file name",
    },
    RecordIdParam: {
        name: "recordId",
        in: "query",
        required: false,
        schema: {
            type: "string",
            format: "uuid",
            example: "ff86400f-9c21-4d56-a02a-fd5af83d4ef7",
        },
        description: "Filter by record identifier",
    },
    SearchParam: {
        name: "search",
        in: "query",
        required: false,
        schema: {
            type: "string",
            example: "TX1011",
        },
        description: "Search across threat details, descriptions, and metadata",
    },
    SortByParam: {
        name: "sortBy",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: [
                "createdAt",
                "updatedAt",
                "confidenceScore",
                "severity",
                "fileName",
                "fileSize",
                "completedAt",
            ],
            default: "createdAt",
        },
        description: "Field to sort results by",
    },
    SortOrderParam: {
        name: "sortOrder",
        in: "query",
        required: false,
        schema: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
        },
        description: "Sort order (ascending or descending)",
    },
};
