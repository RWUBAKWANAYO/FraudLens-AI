"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api";

export interface StatsData {
  users: {
    total: number;
    newSinceLastMonth: number;
  };
  frauds: {
    total: number;
    newSinceLastMonth: number;
  };
  files: {
    total: number;
    newSinceLastMonth: number;
    byType: {
      pdf: number;
      csv: number;
      excel: number;
      json: number;
      other: number;
    };
  };
  records: {
    total: number;
    newSinceLastMonth: number;
  };
  totalFileSize: number;
  period: {
    since: string;
    until: string;
  };
}

export const useStats = () => {
  return useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: () =>
      api
        .get("/stats/company", {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data.data),
    refetchInterval: 300000,
  });
};
