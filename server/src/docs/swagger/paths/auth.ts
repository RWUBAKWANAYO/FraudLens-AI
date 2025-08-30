export const authPaths = {
  "/auth/register": {
    post: {
      summary: "Register a new user",
      description: "Create a new user account and company",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["fullName", "email", "password", "companyName", "companySlug"],
              properties: {
                fullName: {
                  type: "string",
                  example: "Humble Nayo",
                },
                email: {
                  type: "string",
                  format: "email",
                  example: "humblenayo@gmail.com",
                },
                password: {
                  type: "string",
                  format: "password",
                  minLength: 8,
                  example: "securepassword123",
                },
                companyName: {
                  type: "string",
                  example: "Nayo Group",
                },
                companySlug: {
                  type: "string",
                  pattern: "^[a-z0-9-]+$",
                  example: "nayo-inc",
                  description: "Unique URL-friendly identifier for the company",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "User registered successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example:
                      "User registered successfully. Please check your email for verification.",
                  },
                  userId: {
                    type: "string",
                    format: "uuid",
                    example: "b52ccc3f-631c-47ab-8e90-7cbc5b2e19ec",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Bad Request - Validation error or duplicate data",
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    $ref: "#/components/schemas/ValidationError",
                  },
                  {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Company slug already exists",
                      },
                    },
                  },
                  {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Email already registered",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  "/auth/verify-email": {
    get: {
      summary: "Verify email address",
      description: "Verify user email address using verification token",
      tags: ["Authentication"],
      parameters: [
        {
          name: "token",
          in: "query",
          required: true,
          schema: {
            type: "string",
            example: "7c2829271b971d2e3bf5d26ed2c2068a752ccc4426bf7294f8963acda9083b47",
          },
          description: "Email verification token",
        },
      ],
      responses: {
        "200": {
          description: "Email verified successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Email verified successfully",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid verification token",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Invalid verification token",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/auth/login": {
    post: {
      summary: "User login",
      description: "Authenticate user and return JWT token",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "humblenayo@gmail.com",
                },
                password: {
                  type: "string",
                  format: "password",
                  example: "securepassword123",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  token: {
                    type: "string",
                    description: "JWT access token",
                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  },
                  user: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "b52ccc3f-631c-47ab-8e90-7cbc5b2e19ec",
                      },
                      email: {
                        type: "string",
                        format: "email",
                        example: "humblenayo@gmail.com",
                      },
                      fullName: {
                        type: "string",
                        example: "Humble Nayo",
                      },
                      role: {
                        type: "string",
                        enum: ["ADMIN", "MANAGER", "USER"],
                        example: "ADMIN",
                      },
                      company: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            format: "uuid",
                            example: "a0b49a62-3a08-4e84-b126-134da675e048",
                          },
                          name: {
                            type: "string",
                            example: "Nayo Group",
                          },
                          slug: {
                            type: "string",
                            example: "nayo-inc",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Email not verified",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Please verify your email before logging in",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Invalid credentials",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Invalid credentials",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/auth/forgot-password": {
    post: {
      summary: "Request password reset",
      description: "Send password reset email to user",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "humblenayo@gmail.com",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password reset email sent if account exists",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "If the email exists, a password reset link has been sent",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationError",
              },
            },
          },
        },
      },
    },
  },
  "/auth/reset-password": {
    post: {
      summary: "Reset password",
      description: "Reset user password using reset token",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "password"],
              properties: {
                token: {
                  type: "string",
                  example: "5038a62d2109d39d09472e566361b576809763e1c2388b41aa627fae9e5de81b",
                  description: "Password reset token",
                },
                password: {
                  type: "string",
                  format: "password",
                  minLength: 8,
                  example: "newsecurepassword123",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password reset successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Password reset successfully",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired reset token",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Invalid or expired reset token",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/auth/me": {
    get: {
      summary: "Get current user",
      description: "Get information about the currently authenticated user",
      tags: ["Authentication"],
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      responses: {
        "200": {
          description: "User information retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "b52ccc3f-631c-47ab-8e90-7cbc5b2e19ec",
                      },
                      email: {
                        type: "string",
                        format: "email",
                        example: "humblenayo@gmail.com",
                      },
                      fullName: {
                        type: "string",
                        example: "Humble Nayo",
                      },
                      role: {
                        type: "string",
                        enum: ["ADMIN", "MANAGER", "USER"],
                        example: "ADMIN",
                      },
                      isVerified: {
                        type: "boolean",
                        example: true,
                      },
                      lastLogin: {
                        type: "string",
                        format: "date-time",
                        example: "2025-08-28T21:41:41.098Z",
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2025-08-28T21:36:50.203Z",
                      },
                      company: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            format: "uuid",
                            example: "a0b49a62-3a08-4e84-b126-134da675e048",
                          },
                          name: {
                            type: "string",
                            example: "Nayo Group",
                          },
                          slug: {
                            type: "string",
                            example: "nayo-inc",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Authentication failed",
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Please verify your email before logging in",
                      },
                    },
                  },
                  {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Invalid token",
                      },
                    },
                  },
                  {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Authentication failed",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/Unauthorized",
        },
      },
    },
  },
  "/auth/invite": {
    post: {
      summary: "Send user invitation",
      description: "Send an invitation to a user to join the company",
      tags: ["Authentication"],
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "role"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "johndoe@gmail.com",
                  description: "Email address of the user to invite",
                },
                role: {
                  type: "string",
                  enum: ["ADMIN", "MANAGER", "USER"],
                  example: "MANAGER",
                  description: "Role to assign to the invited user",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Invitation sent successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Invitation sent successfully",
                  },
                  invitationId: {
                    type: "string",
                    format: "uuid",
                    example: "e507c579-e5d2-439e-8564-e89d9e0eddd8",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Bad Request - Active invitation already exists",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Active invitation already exists",
                  },
                },
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/Unauthorized",
        },
        "403": {
          description: "Forbidden - Insufficient permissions",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Insufficient permissions to send invitations",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/auth/accept-invitation": {
    post: {
      summary: "Accept user invitation",
      description: "Accept invitation and set password for invited user",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "password"],
              properties: {
                token: {
                  type: "string",
                  example: "c7e64934ad3eb210a94f68bf78d01d966cb64e7250ef7489b27dc767acfb1248",
                  description: "Invitation token",
                },
                password: {
                  type: "string",
                  format: "password",
                  minLength: 8,
                  example: "securepassword123",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Invitation accepted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Email verified successfully",
                  },
                  userId: {
                    type: "string",
                    format: "uuid",
                    example: "b52ccc3f-631c-47ab-8e90-7cbc5b2e19ec",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired invitation",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Invalid or expired invitation",
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
