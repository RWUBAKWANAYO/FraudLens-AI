import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api";
import { CreateWebhookFormData, UpdateWebhookFormData } from "@/lib/zod-schemas/webhooks";
import { useRequireAuth } from "./useRequireAuth";

export interface Webhook {
  id: string;
  companyId: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastDelivery?: {
    id: string;
    event: string;
    success: boolean;
    attempt: number;
    error: string | null;
    responseTime: number;
    environment: string;
    createdAt: string;
  };
}

// GET ALL WEBHOOKS
export const useWebhooks = () => {
  const { user } = useRequireAuth();
  return useQuery<Webhook[]>({
    queryKey: ["webhooks"],
    queryFn: () => {
      if (!user?.company?.id) {
        throw new Error("Company ID is required");
      }
      return api
        .get(`/webhooks?companyId=${user.company.id}`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data);
    },
    enabled: !!user?.company?.id,
  });
};

// CREATE WEBHOOK
export const useCreateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWebhookFormData) =>
      api
        .post("/webhooks", data, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
};

// UPDATE WEBHOOK
export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookFormData }) =>
      api
        .put(`/webhooks/${id}`, data, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
};

// DELETE WEBHOOK
export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .delete(`/webhooks/${id}`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
};
