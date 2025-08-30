export const userResponses = {
  UserListSuccess: {
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
  UserRoleUpdated: {
    description: "User role updated successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/UserRoleUpdateResponse",
        },
      },
    },
  },
  UserDeleted: {
    description: "User deleted successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/UserDeleteResponse",
        },
      },
    },
  },
};
