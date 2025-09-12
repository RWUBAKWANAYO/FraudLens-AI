import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api";
import { Threat, ThreatsResponse, ThreatQueryParams } from "@/types/threat";

// GET THREATS WITH FILTERS
export const useThreats = (params: ThreatQueryParams = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value.toString());
    }
  });

  return useQuery<ThreatsResponse>({
    queryKey: ["threats", params],
    queryFn: () =>
      api
        .get(`/audit/threats?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    placeholderData: (prev) => prev,
  });
};

// GET THREAT DETAILS WITH AI EXPLANATION
export const useThreatDetails = (threatId: string, options?: { enabled?: boolean }) => {
  return useQuery<Threat>({
    queryKey: ["threat", threatId],
    queryFn: () =>
      api
        .get(`/audit/threats/${threatId}/analysis`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    enabled: options?.enabled !== false && !!threatId,
  });
};

// UPDATE THREAT STATUS
export const useUpdateThreatStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threatId, status }: { threatId: string; status: string }) =>
      api
        .patch(
          `/audit/threats/${threatId}`,
          { status },
          {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
          }
        )
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threats"] });
    },
  });
};
