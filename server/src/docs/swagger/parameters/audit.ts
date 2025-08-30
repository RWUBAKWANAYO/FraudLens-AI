export const auditParameters = {
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
      enum: [
        "DUP_IN_BATCH__TXID",
        "DUP_IN_DB__TXID",
        "DUP_IN_BATCH__CANONICAL",
        "DUP_IN_DB__CANONICAL",
        "RULE_TRIGGER",
        "SIMILARITY_MATCH",
      ],
    },
    description: "Filter by threat type",
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
  UploadIdParam: {
    name: "uploadId",
    in: "query",
    required: false,
    schema: {
      type: "string",
      format: "uuid",
      example: "efa788be-a350-44aa-af5a-d7deb544cbef",
    },
    description: "Filter by upload identifier",
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
      enum: ["createdAt", "updatedAt", "confidenceScore", "severity"],
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
