export const auditResponses = {
  FileUploadSuccess: {
    description: "File uploaded successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/FileUploadResponse",
        },
      },
    },
  },
  AlertsListSuccess: {
    description: "Alerts retrieved successfully",
    content: {
      "application/json": {
        schema: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Alert",
          },
        },
      },
    },
  },
  ThreatsListSuccess: {
    description: "Threats retrieved successfully",
    content: {
      "application/json": {
        schema: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Threat",
          },
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
