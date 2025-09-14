export const userPaths = {
  "/users": {
    get: {
      summary: "Get company users",
      description: "Retrieve list of users in the current user's company. Requires authentication.",
      tags: ["Users"],
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      responses: {
        "200": {
          description: "Users retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/User",
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
        "403": {
          $ref: "#/components/responses/Forbidden",
        },
      },
    },
  },
  "/users/{userId}/role": {
    parameters: [{ $ref: "#/components/parameters/UserIdParam" }],
    patch: {
      summary: "Update user role",
      description: "Update user role. Requires ADMIN role.",
      tags: ["Users"],
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UserRoleUpdate",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "User role updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserRoleUpdateResponse",
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
        "403": {
          $ref: "#/components/responses/Forbidden",
        },
        "404": {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "User not found",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/users/{userId}": {
    parameters: [{ $ref: "#/components/parameters/UserIdParam" }],
    delete: {
      summary: "Delete user",
      description: "Delete a user account. Requires ADMIN role.",
      tags: ["Users"],
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      responses: {
        "200": {
          description: "User deleted successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserDeleteResponse",
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
        "403": {
          $ref: "#/components/responses/Forbidden",
        },
        "404": {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "User not found",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
