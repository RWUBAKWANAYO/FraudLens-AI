import { AxiosError } from "axios";

export type ApiError = {
  status?: number;
  message: string;
  details?: any;
  errors?: Array<{
    type?: string;
    value?: any;
    msg?: string;
    path?: string;
    location?: string;
  }>;
};

export function extractApiError(err: unknown): ApiError {
  console.log("extractApiError", err);

  if (err && typeof err === "object" && "isAxiosError" in err) {
    const axiosErr = err as AxiosError<any>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;

    let message = "Unexpected error occurred";
    let details = data;
    let fieldErrors: ApiError["errors"] = [];

    if (data) {
      if (typeof data === "object") {
        if (data.message) {
          message = data.message;
        } else if (data.error) {
          message = data.error;
        }

        if (Array.isArray(data.errors) && data.errors.length > 0) {
          fieldErrors = data.errors;
          if (message === "Unexpected error occurred" && data.errors[0]?.msg) {
            message = data.errors[0].msg;
          }
        } else if (data.details && Array.isArray(data.details)) {
          fieldErrors = data.details;
          if (message === "Unexpected error occurred" && data.details[0]?.message) {
            message = data.details[0].message;
          }
        }
      } else if (typeof data === "string") {
        message = data;
      }
    }

    if (message === "Unexpected error occurred" && axiosErr.message) {
      message = axiosErr.message;
    }

    return {
      status,
      message,
      details,
      errors: fieldErrors && fieldErrors.length > 0 ? fieldErrors : undefined,
    };
  }

  if (err instanceof Error) {
    return { message: err.message };
  }

  if (typeof err === "string") {
    return { message: err };
  }

  return { message: "Unknown error" };
}
