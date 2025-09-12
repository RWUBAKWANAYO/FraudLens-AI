import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api";
import { CreateApiKeyFormData } from "@/lib/zod-schemas/api-keys";
import { useToast } from "./use-toast";

export interface ApiKey {
  id: string;
  companyId: string;
  name: string;
  key: string;
  secret: string;
  enabled: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: string;
}

// GET ALL API KEYS
export const useApiKeys = () => {
  return useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: () =>
      api
        .get("/api-keys", {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
  });
};

// CREATE API KEY
export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyFormData) =>
      api
        .post("/api-keys", data, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
};

// REVOKE API KEY
export const useRevokeApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(
          `/api-keys/${id}/revoke`,
          {},
          {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
          }
        )
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
};

// REACTIVATE API KEY
export const useReactivateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(
          `/api-keys/${id}/reactivate`,
          {},
          {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
          }
        )
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
};

// ROTATE API KEY SECRET
export const useRotateApiKeySecret = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(
          `/api-keys/${id}/rotate-secret`,
          {},
          {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
          }
        )
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
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

// DELETE API KEY
export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .delete(`/api-keys/${id}`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
};
