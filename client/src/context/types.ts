import { User } from "@/types/user.interface";

export interface UploadProgress {
  uploadId: string;
  progress: number;
  stage: string;
  message: string;
  details?: {
    recordsProcessed: number;
    totalRecords: number;
    threatsFound: number;
    currentBatch?: number;
    totalBatches?: number;
  };
  timestamp: string;
}

export interface UploadResult {
  uploadId: string;
  result: any;
  threats: any[];
  summary: {
    message: string;
    recordsAnalyzed: number;
    threatsDetected: number;
  };
  timestamp: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
  uploadId?: string;
  threatId?: string;
}

export interface UploadContextType {
  activeUploads: Map<string, UploadProgress>;
  completedUploads: Map<string, UploadResult>;
  isProcessing: boolean;
  alerts: Alert[];
  alertSummary: Alert[];
  clearAlerts: () => void;
  dismissAlert: (alertId: string) => void;
}

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateUser: (user: User) => void;
};
