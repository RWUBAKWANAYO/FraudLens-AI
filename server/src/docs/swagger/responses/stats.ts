export const statsResponses = {
  CompanyStatsSuccess: {
    description: "Company statistics retrieved successfully",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/CompanyStatsResponse",
        },
      },
    },
  },
};
