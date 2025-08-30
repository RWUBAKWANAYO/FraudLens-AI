export const auditPaths = {
  "/audit/upload": {
    post: {
      summary: "Upload file for analysis",
      description: "Upload a file for security analysis and threat detection",
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
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "File uploaded successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/FileUploadResponse",
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
  },
  "/audit/alerts": {
    get: {
      summary: "Get threat alerts",
      description: "Retrieve security alerts with filtering options",
      tags: ["Audit"],
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { $ref: "#/components/parameters/AlertStatusParam" },
        { $ref: "#/components/parameters/SeverityParam" },
      ],
      responses: {
        "200": {
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
      description: "Retrieve detected threats with filtering options",
      tags: ["Audit"],
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { $ref: "#/components/parameters/SeverityParam" },
        {
          name: "status",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["open", "in_progress", "resolved", "false_positive"],
          },
          description: "Filter threats by status",
        },
        {
          name: "threatType",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["DUP_IN_DB__TXID", "OTHER_THREAT_TYPE"],
          },
          description: "Filter threats by type",
        },
      ],
      responses: {
        "200": {
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
