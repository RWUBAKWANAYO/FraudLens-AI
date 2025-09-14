export interface AlertFilters {
  severity?: string;
  delivered?: boolean;
  threatId?: string;
  recordId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AlertQueryParams extends AlertFilters {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
