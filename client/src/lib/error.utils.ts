import { AxiosError } from "axios";

export type ApiError = {
  status?: number;
  message: string;
  details?: any;
};

export function extractApiError(err: unknown): ApiError {
  if (err && typeof err === "object" && "isAxiosError" in err) {
    const axiosErr = err as AxiosError<any>;

    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;

    const message = data?.error || data?.message || axiosErr.message || "Unexpected error occurred";

    return { status, message, details: data };
  }

  if (err instanceof Error) {
    return { message: err.message };
  }

  return { message: "Unknown error" };
}
