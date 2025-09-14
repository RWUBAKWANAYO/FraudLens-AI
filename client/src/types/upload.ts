export interface Upload {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  publicId: string | null;
  resourceType: string | null;
  _count: {
    records: number;
    threats: number;
  };
}

export interface UploadsResponse {
  uploads: Upload[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UploadQueryParams {
  status?: string;
  fileType?: string;
  fileName?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}
