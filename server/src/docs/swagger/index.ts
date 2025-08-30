import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { swaggerDefinition } from "./definitions";
import { allSchemas } from "./schemas";
import { allParameters } from "./parameters";
import { allResponses } from "./responses";
import { allPaths } from "./paths";

const completeSwaggerDefinition = {
  ...swaggerDefinition,
  components: {
    ...swaggerDefinition.components,
    schemas: allSchemas,
    parameters: allParameters,
    responses: allResponses,
  },
  paths: allPaths,
};

const options = {
  swaggerDefinition: completeSwaggerDefinition,
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
  if (process.env.NODE_ENV !== "production") {
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "API Documentation",
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          tryItOutEnabled: true,
        },
      })
    );

    console.log("📚 OpenAPI documentation available at /api-docs");
  }
};

export const getSwaggerSpec = () => swaggerSpec;
