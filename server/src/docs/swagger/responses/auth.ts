export const authResponses = {
  RegisterSuccess: {
    description: "Registration successful",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "User registered successfully. Please check your email for verification.",
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
  LoginSuccess: {
    description: "Login successful",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              example:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiNTJjY2MzZi02MzFjLTQ3YWItOGU5MC03Y2JjNWIyZTE5ZWMiLCJlbWFpbCI6Imh1bWJsZW5heW9AZ21haWwuY29tIiwiY29tcGFueUlkIjoiYTBiNDlhNjItM2EwOC00ZTg0LWIxMjYtMTM0ZGE2NzVlMDQ4Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzU2NDE3MzAyLCJleHAiOjE3NTcwMjIxMDJ9.7Ono_XP3j2txiPebgB1Jr09mtMomgVFTQlxq-n9EkpM",
            },
            user: {
              $ref: "#/components/schemas/User",
            },
          },
        },
      },
    },
  },
  EmailVerifySuccess: {
    description: "Email verification successful",
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
  InvitationAcceptSuccess: {
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
  ForgotPasswordSuccess: {
    description: "Password reset email sent",
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
  ResetPasswordSuccess: {
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
};
