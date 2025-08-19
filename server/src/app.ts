import express from "express";
import "dotenv/config";
import cors from "cors";

import { uploadRouter } from "./routes/upload";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/upload", uploadRouter);

export default app;
