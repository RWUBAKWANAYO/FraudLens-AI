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
    description: "Filter threats by type",
  },
};
