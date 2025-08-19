import { NextFunction, Request, Response } from "express";
import { ErrorFormat } from "../utils/errorFormat";

export const globalErrorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const developmentError = (res: Response, error: any) => {
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      stack: error.stack,
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  };

  const productionError = (res: Response, error: any) => {
    if (error.isOperational) {
      res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });
    } else {
      console.error("ERROR 💥", error); // Log unexpected errors
      res.status(500).json({
        status: "error",
        message: "Something went wrong! Please try again later.",
      });
    }
  };

  // PostgreSQL Error Handlers
  const postgresErrorHandler = (error: any) => {
    // Handle unique_violation (PostgreSQL error code: 23505)
    if (error.code === "23505") {
      const detail = error.detail || "";
      const match = detail.match(/Key \((.*?)\)=\((.*?)\)/);
      const key = match ? match[1] : "field";
      const value = match ? match[2] : "unknown";
      const message = `The value '${value}' for '${key}' already exists. Please use another value!`;
      return new ErrorFormat(message, 400);
    }

    // Handle not_null_violation (PostgreSQL error code: 23502)
    if (error.code === "23502") {
      const column = error.column || "field";
      const message = `Required field '${column}' is missing.`;
      return new ErrorFormat(message, 400);
    }

    // Handle foreign_key_violation (PostgreSQL error code: 23503)
    if (error.code === "23503") {
      const message = `Invalid reference: ${error.detail || "Related record not found"}`;
      return new ErrorFormat(message, 400);
    }

    // Handle check_violation (PostgreSQL error code: 23514)
    if (error.code === "23514") {
      const message = `Validation failed: ${error.detail || "Invalid data"}`;
      return new ErrorFormat(message, 400);
    }

    // Default database error
    return new ErrorFormat("Database operation failed", 500);
  };

  // Common Error Handlers (work for both PostgreSQL and general cases)
  const validationErrorHandler = (error: any) => {
    // Handle Zod or other validation errors
    if (error.errors) {
      const errorArray = Object.values(error.errors).map((err: any) => err.message);
      const message = `Invalid data: ${errorArray.join(". ")}`;
      return new ErrorFormat(message, 400);
    }
    return error;
  };

  const jwtErrorHandler = () => new ErrorFormat("Invalid token. Please login again!", 401);
  const tokenExpireErrorHandler = () => new ErrorFormat("Token expired. Please login again!", 401);

  // Initialize error properties
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  // Handle specific error types
  if (error.name === "JsonWebTokenError") error = jwtErrorHandler();
  if (error.name === "TokenExpiredError") error = tokenExpireErrorHandler();
  if (error.name === "ValidationError") error = validationErrorHandler(error);

  // PostgreSQL-specific errors
  if (error.code && error.code.startsWith("23")) {
    // All PostgreSQL constraint errors
    error = postgresErrorHandler(error);
  }

  // Send appropriate response based on environment
  if (process.env.NODE_ENV === "development") {
    developmentError(res, error);
  } else {
    productionError(res, error);
  }
};
