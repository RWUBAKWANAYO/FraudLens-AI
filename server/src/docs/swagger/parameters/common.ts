export const commonParameters = {
  IdParam: {
    name: "id",
    in: "path",
    required: true,
    schema: {
      type: "string",
      format: "uuid",
      example: "51a19664-088e-4cb1-9887-b9c40ed86f09",
    },
    description: "Resource identifier",
  },
  UserIdParam: {
    name: "userId",
    in: "path",
    required: true,
    schema: {
      type: "string",
      format: "uuid",
      example: "ea8f72ce-43a5-44b1-84e7-2713eefc8cbb",
    },
    description: "User identifier",
  },
  CompanyIdParam: {
    name: "companyId",
    in: "query",
    required: true,
    schema: {
      type: "string",
      format: "uuid",
      example: "a0b49a62-3a08-4e84-b126-134da675e048",
    },
    description: "Company identifier",
  },
  PageParam: {
    name: "page",
    in: "query",
    required: false,
    schema: {
      type: "integer",
      minimum: 1,
      default: 1,
    },
    description: "Page number for pagination",
  },
  LimitParam: {
    name: "limit",
    in: "query",
    required: false,
    schema: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 20,
    },
    description: "Number of items per page",
  },
};
