export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
  timestamp?: string;
  cause?: unknown;
}

export interface HttpError extends AppError {
  statusCode: number;
  response?: Response;
}

export interface DatabaseError extends AppError {
  code: string;
  constraint?: string;
  table?: string;
}

export interface ValidationError extends AppError {
  fieldErrors?: Record<string, string[]>;
}

export interface NetworkError extends AppError {
  url?: string;
  method?: string;
}

// Type guards
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error;
}

export function isHttpError(error: unknown): error is HttpError {
  return isAppError(error) && "statusCode" in error && typeof error.statusCode === "number";
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return isAppError(error) && "code" in error && typeof error.code === "string";
}

export function isValidationError(error: unknown): error is ValidationError {
  return isAppError(error) && "fieldErrors" in error;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return isAppError(error) && ("url" in error || "method" in error);
}

// Error creation utilities
export function createAppError(
  message: string,
  options: {
    code?: string;
    statusCode?: number;
    details?: unknown;
    cause?: unknown;
  } = {}
): AppError {
  const error = new Error(message) as AppError;
  error.name = "AppError";
  error.code = options.code;
  error.statusCode = options.statusCode;
  error.details = options.details;
  error.timestamp = new Date().toISOString();

  if (options.cause && options.cause instanceof Error) {
    error.cause = options.cause;
  }

  return error;
}

export function createHttpError(
  message: string,
  statusCode: number,
  options: {
    code?: string;
    details?: unknown;
    response?: Response;
    cause?: unknown;
  } = {}
): HttpError {
  const error = createAppError(message, { ...options, statusCode }) as HttpError;
  error.name = "HttpError";
  error.response = options.response;
  return error;
}
