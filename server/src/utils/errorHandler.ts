import { Response } from "express";

import {
  AppError as AppErrorType,
  isAppError,
  isHttpError,
  isDatabaseError,
  isNetworkError,
  createAppError,
} from "../types/error";

export class ErrorHandler {
  static getErrorMessage(error: unknown): string {
    if (isAppError(error)) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }

    return "An unknown error occurred";
  }

  static getErrorCode(error: unknown): string | undefined {
    if (isAppError(error) && error.code) {
      return error.code;
    }

    if (error && typeof error === "object" && "code" in error) {
      return String(error.code);
    }

    return undefined;
  }

  static getStatusCode(error: unknown): number | undefined {
    if (isHttpError(error)) {
      return error.statusCode;
    }

    if (error && typeof error === "object" && "statusCode" in error) {
      return Number(error.statusCode);
    }

    if (error && typeof error === "object" && "status" in error) {
      return Number(error.status);
    }

    return undefined;
  }

  static isRetryable(error: unknown): boolean {
    if (isNetworkError(error)) {
      return true;
    }

    const statusCode = this.getStatusCode(error);
    if (statusCode && statusCode >= 500 && statusCode < 600) {
      return true;
    }

    if (statusCode === 429) {
      return true;
    }

    if (isDatabaseError(error)) {
      const retryableCodes = [
        "ECONNRESET",
        "ETIMEDOUT",
        "PROTOCOL_CONNECTION_LOST",
        "ER_LOCK_DEADLOCK",
        "ER_LOCK_WAIT_TIMEOUT",
      ];
      return retryableCodes.includes(error.code || "");
    }

    return false;
  }

  static logError(error: unknown, context: string = "Application"): void {
    const message = this.getErrorMessage(error);
    const code = this.getErrorCode(error);
    const statusCode = this.getStatusCode(error);

    console.error(`[${context}] Error:`, {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  static toAppError(error: unknown): AppErrorType {
    if (isAppError(error)) {
      return error;
    }

    return createAppError(this.getErrorMessage(error), {
      cause: error,
      details: error,
    });
  }

  static formatForResponse(error: unknown): {
    error: string;
    code?: string;
    statusCode?: number;
    details?: unknown;
  } {
    const appError = this.toAppError(error);

    return {
      error: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      details: process.env.NODE_ENV === "development" ? appError.details : undefined,
    };
  }
}

export async function safeTry<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const appError = ErrorHandler.toAppError(error) as any;
    ErrorHandler.logError(appError, context);
    return { data: null, error: appError };
  }
}

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ""} not found`, 404);
  }
}

export const handleError = (error: unknown, res: Response) => {
  console.error("Error:", error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }

  if (error instanceof Error) {
    return res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }

  res.status(500).json({ error: "Internal server error" });
};
