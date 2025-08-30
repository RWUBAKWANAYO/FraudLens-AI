export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API Documentation",
    version: "1.0.0",
    description: "Complete API documentation for the backend service",
    contact: {
      name: "API Support",
      email: "support@example.com",
    },
    license: {
      name: "MIT",
      url: "https://spdx.org/licenses/MIT.html",
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || "http://localhost:8080/api/v1",
      description: process.env.NODE_ENV || "development",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from /auth/login endpoint",
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "API key in format 'Bearer APIKey {key}:{secret}'",
      },
    },
  },
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
};
