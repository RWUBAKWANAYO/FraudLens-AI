export const auditSchemas = {
  DataUploadRequest: {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        type: "object",
        required: ["txId", "partner", "amount", "date", "currency"],
        properties: {
          txId: {
            type: "string",
            example: "463dghjd4637s4647a587685",
            description: "Transaction ID",
          },
          partner: {
            type: "string",
            example: "John Wayne",
            description: "Transaction partner",
          },
          amount: {
            type: "number",
            example: 4000,
            description: "Transaction amount",
          },
          date: {
            type: "string",
            format: "date",
            example: "2025-09-01",
            description: "Transaction date",
          },
          currency: {
            type: "string",
            example: "USD",
            description: "Transaction currency",
          },
          ip: {
            type: "string",
            example: "192.168.1.1",
            description: "IP address",
            nullable: true,
          },
          device: {
            type: "string",
            example: "Chrome Browser",
            description: "Device information",
            nullable: true,
          },
          geoCountry: {
            type: "string",
            example: "US",
            description: "Geographic country",
            nullable: true,
          },
          geoCity: {
            type: "string",
            example: "New York",
            description: "Geographic city",
            nullable: true,
          },
          mcc: {
            type: "string",
            example: "5942",
            description: "Merchant category code",
            nullable: true,
          },
          channel: {
            type: "string",
            example: "web",
            description: "Transaction channel",
            nullable: true,
          },
        },
      },
    },
  },

  FileUploadResponse: {
    type: "object",
    properties: {
      uploadId: {
        type: "string",
        format: "uuid",
        example: "2de228b2-f7db-4da7-a83f-03e0cb050e3e",
      },
      recordsAnalyzed: {
        type: "integer",
        example: 1,
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
            example: 1,
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
            example:
              "Data uploaded successfully. 1 record queued for processing. Threats will be detected asynchronously.",
            nullable: true,
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
  UploadHistoryItem: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "ec45f4f5-165c-40ac-8c57-6a903aceb063",
      },
      fileName: {
        type: "string",
        example: "transactions.json",
      },
      fileType: {
        type: "string",
        example: "application/json",
      },
      fileSize: {
        type: "integer",
        example: 551,
      },
      status: {
        type: "string",
        enum: ["pending", "processing", "completed", "failed"],
        example: "completed",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2025-08-31T20:50:21.693Z",
      },
      completedAt: {
        type: "string",
        format: "date-time",
        example: "2025-08-31T20:50:46.674Z",
        nullable: true,
      },
      publicId: {
        type: "string",
        example:
          "fraud-detection/company/ca5df2e2-abc2-4542-8328-3a19ee1a1cc0/uploads/transactions.json",
      },
      resourceType: {
        type: "string",
        nullable: true,
        example: null,
      },
      _count: {
        type: "object",
        properties: {
          records: {
            type: "integer",
            example: 5,
          },
          threats: {
            type: "integer",
            example: 1,
          },
        },
      },
    },
  },
  UploadHistoryResponse: {
    type: "object",
    properties: {
      uploads: {
        type: "array",
        items: {
          $ref: "#/components/schemas/UploadHistoryItem",
        },
      },
      pagination: {
        $ref: "#/components/schemas/Pagination",
      },
    },
  },
  AlertsListResponse: {
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
  ThreatsListResponse: {
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
};
