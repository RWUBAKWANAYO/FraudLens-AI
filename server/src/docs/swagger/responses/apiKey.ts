export const apiKeyResponses = {
  ApiKeyCreated: {
    description: "API key created successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ApiKeyCreateResponse",
        },
      },
    },
  },
  ApiKeyRotated: {
    description: "API key secret rotated successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ApiKeyRotateResponse",
        },
      },
    },
  },
  ApiKeyRevoked: {
    description: "API key revoked successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ApiKeyRevokeResponse",
        },
      },
    },
  },
  ApiKeyReactivated: {
    description: "API key reactivated successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ApiKeyReactivateResponse",
        },
      },
    },
  },
  ApiKeyDeleted: {
    description: "API key deleted successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ApiKeyDeleteResponse",
        },
      },
    },
  },
};
