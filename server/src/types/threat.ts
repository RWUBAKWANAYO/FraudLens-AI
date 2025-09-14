export interface ThreatFilters {
  status?: string;
  threatType?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  startDate?: string;
  endDate?: string;
  recordId?: string;
  uploadId?: string;
  search?: string;
}

export interface ThreatQueryParams extends ThreatFilters {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
