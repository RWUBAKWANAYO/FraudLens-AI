"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api";
import { UploadsResponse, UploadQueryParams } from "@/types/upload";
import { useToast } from "./use-toast";

// GET UPLOADS WITH FILTERS
export const useUploads = (params: UploadQueryParams = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value.toString());
    }
  });

  return useQuery<UploadsResponse>({
    queryKey: ["uploads", params],
    queryFn: async () => {
      try {
        const response = await api.get(`/audit/upload?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 400) {
          throw new Error("Invalid query parameters. Please check your filters.");
        }
        if (error.response?.status === 500) {
          throw new Error("Server error. Please try again later.");
        }
        throw error;
      }
    },
    placeholderData: (prev) => prev,
    retry: 1,
  });
};

// DOWNLOAD UPLOAD
export const useDownloadUpload = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (uploadId: string) => {
      const response = await api.get(`/audit/download/${uploadId}`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/octet-stream",
        },
        responseType: "blob",
      });

      return new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err?.message || "Something went wrong",
        style: {
          background: "var(--foreground)",
          color: "var(--primary-red)",
          border: "1px solid var(--primary-red)",
        },
      });
    },
  });
};

// UPLOAD FILE
export const useUpload = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, companyId }: { file: File; companyId: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);

      const response = await api.post("/audit/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });

      return response.data;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        style: {
          background: "var(--foreground)",
          color: "var(--primary-red)",
          border: "1px solid var(--primary-red)",
        },
      });
    },
  });
};
