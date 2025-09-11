import axios, { AxiosError } from "axios";
import { extractApiError } from "./error.utils";

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

const baseURL = process.env.NEXT_PUBLIC_SERVER_URL!;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

api.interceptors.request.use((config: any) => {
  if (!config.headers) config.headers = {};
  if (accessToken) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const data = error.response?.data as any;

    const isTokenExpired =
      status === 401 && (data?.code === "TOKEN_EXPIRED" || data?.error === "Token expired");

    if (isTokenExpired) {
      if (isRefreshing) {
        return new Promise((resolve, _reject) => {
          addRefreshSubscriber((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
            }
            // @ts-ignore
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const resp = await axios.post(
          `${baseURL}/auth/refresh-token`,
          {},
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json", Accept: "application/json" },
          }
        );

        const newAccessToken = resp.data?.accessToken;
        setAccessToken(newAccessToken || null);
        onRefreshed(newAccessToken || null);
        isRefreshing = false;

        if (newAccessToken && originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        }
        // @ts-ignore
        return api(originalRequest);
      } catch (err) {
        isRefreshing = false;
        setAccessToken(null);
        onRefreshed(null);
        try {
          await axios.post(`${baseURL}/auth/logout`, {}, { withCredentials: true });
        } catch (_e) {}
        return Promise.reject(extractApiError(error));
      }
    }

    return Promise.reject(extractApiError(error));
  }
);
