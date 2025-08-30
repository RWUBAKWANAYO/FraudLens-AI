"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSwaggerSpec = exports.setupSwagger = void 0;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const definitions_1 = require("./definitions");
const schemas_1 = require("./schemas");
const parameters_1 = require("./parameters");
const responses_1 = require("./responses");
const paths_1 = require("./paths");
const completeSwaggerDefinition = Object.assign(Object.assign({}, definitions_1.swaggerDefinition), { components: Object.assign(Object.assign({}, definitions_1.swaggerDefinition.components), { schemas: schemas_1.allSchemas, parameters: parameters_1.allParameters, responses: responses_1.allResponses }), paths: paths_1.allPaths });
const options = {
    swaggerDefinition: completeSwaggerDefinition,
    apis: [],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    if (process.env.NODE_ENV !== "production") {
        app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
            explorer: true,
            customCss: ".swagger-ui .topbar { display: none }",
            customSiteTitle: "API Documentation",
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                tryItOutEnabled: true,
            },
        }));
        console.log("📚 OpenAPI documentation available at /api-docs");
    }
};
exports.setupSwagger = setupSwagger;
const getSwaggerSpec = () => swaggerSpec;
exports.getSwaggerSpec = getSwaggerSpec;
