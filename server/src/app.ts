import express from "express";
import "dotenv/config";
import cors from "cors";
import { router } from "./routes/index";
import { globalErrorHandler } from "./middleware/globalErrorHandler";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", router);

app.use(globalErrorHandler);

export default app;
