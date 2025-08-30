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
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Alert",
              },
            },
            pagination: {
              $ref: "#/components/schemas/Pagination",
            },
            total: {
              type: "integer",
              example: 100,
            },
            filtered: {
              type: "integer",
              example: 25,
            },
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
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Threat",
              },
            },
            pagination: {
              $ref: "#/components/schemas/Pagination",
            },
            total: {
              type: "integer",
              example: 100,
            },
            filtered: {
              type: "integer",
              example: 25,
            },
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
