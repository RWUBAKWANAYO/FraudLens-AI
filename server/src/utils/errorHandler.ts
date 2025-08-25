// utils/errorHandler.ts
import {
  AppError,
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
    // Network errors (timeouts, connection resets)
    if (isNetworkError(error)) {
      return true;
    }

    // HTTP 5xx errors (server errors)
    const statusCode = this.getStatusCode(error);
    if (statusCode && statusCode >= 500 && statusCode < 600) {
      return true;
    }

    // HTTP 429 (rate limiting)
    if (statusCode === 429) {
      return true;
    }

    // Database connection errors
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

  static toAppError(error: unknown): AppError {
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

// Global error handling function
export function handleError(error: unknown, context?: string): never {
  ErrorHandler.logError(error, context);
  throw ErrorHandler.toAppError(error);
}

// Safe try-catch wrapper
export async function safeTry<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const appError = ErrorHandler.toAppError(error);
    ErrorHandler.logError(appError, context);
    return { data: null, error: appError };
  }
}
