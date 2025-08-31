export interface BaseStats {
  totalFiles: number;
  totalRecords: number;
  totalFrauds: number;
  totalUsers: number;
  timestamp: string;
}

export interface CompanyStats extends BaseStats {
  companyId: string;
  pendingFiles?: number;
  processingFiles?: number;
  completedFiles?: number;
  totalFileSize?: number;
  averageRecordsPerFile?: number;
  queryTime: number;
}

export interface GlobalStats extends BaseStats {
  totalCompanies?: number;
  systemHealth?: {
    uptime: number;
    memoryUsage: number;
    activeConnections: number;
  };
}

export interface StatsOptions {
  includeRecentActivity?: boolean;
  includeSystemHealth?: boolean;
  activityLimit?: number;
}

export interface StatsResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    generatedAt: string;
    cacheHit?: boolean;
    queryTime?: number;
  };
}
