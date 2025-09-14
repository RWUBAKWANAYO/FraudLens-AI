"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { DateRangePicker } from "@/components/common/date-range";
import { Pagination } from "@/components/common/pagination";
import { ThreatCard } from "@/components/threats/threat-card";
import { useThreats } from "@/hooks/useThreats";
import { ThreatQueryParams } from "@/types/threat";
import { Button } from "@/components/ui/button";
import { THREAT_TYPES } from "@/types/threat";
import { getThreatTypeShortLabel } from "@/lib/constants";
import { StatusMessage } from "@/components/common/status-message";
import { useDebounce } from "@/hooks/useDebounce";

export default function Threats() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [queryParams, setQueryParams] = useState<ThreatQueryParams>({
    page: 1,
    limit: 6,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const {
    data: threatsResponse,
    isLoading,
    error,
  } = useThreats({
    ...queryParams,
    search: debouncedSearchTerm || undefined,
  });

  useEffect(() => {
    setQueryParams((prev) => ({
      ...prev,
      search: debouncedSearchTerm || undefined,
      page: 1,
    }));
  }, [debouncedSearchTerm]);

  const handleSearchInput = (search: string) => {
    setSearchTerm(search);
  };

  const handleThreatTypeFilter = (threatType: string) => {
    setQueryParams((prev) => ({
      ...prev,
      threatType: threatType === "all" ? undefined : threatType,
      page: 1,
    }));
  };

  const handleDateRangeChange = (range: { startDate?: Date; endDate?: Date }) => {
    setQueryParams((prev) => ({
      ...prev,
      startDate: range.startDate ? range.startDate.toISOString() : undefined,
      endDate: range.endDate ? range.endDate.toISOString() : undefined,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setQueryParams((prev) => ({ ...prev, page }));
  };

  const handleSortChange = (sortBy: string) => {
    setQueryParams((prev) => ({
      ...prev,
      sortBy,
      page: 1,
    }));
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setQueryParams({
      page: 1,
      limit: 6,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    searchTerm ||
    queryParams.threatType ||
    queryParams.startDate ||
    queryParams.endDate ||
    queryParams.sortBy !== "createdAt" ||
    queryParams.sortOrder !== "desc";

  if (isLoading || error) {
    return <StatusMessage isLoading={isLoading} error={error} height="calc(100vh - 120px)" />;
  }

  return (
    <div
      className="bg-foreground rounded-lg p-4 sm:p-6 flex flex-col"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      {!isLoading && threatsResponse?.data && (
        <div className="flex flex-col flex-grow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Fraud Alert List</h2>
            {threatsResponse?.data.length > 0 && (
              <Button
                onClick={clearAllFilters}
                className="colored-button bg-colored-primary text-white font-semibold"
                disabled={!hasActiveFilters}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
          {threatsResponse?.data.length > 0 && (
            <div className="w-full flex flex-col xl:flex-row items-start xl:items-end justify-between gap-4 mt-4 mb-10">
              <DateRangePicker title="Date Range" onChange={handleDateRangeChange} />

              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full xl:w-auto">
                <div className="space-y-2">
                  <label className="text-sm font-semibold px-1">Threat Type</label>
                  <Select
                    value={queryParams.threatType || "all"}
                    onValueChange={handleThreatTypeFilter}
                  >
                    <SelectTrigger className="w-[150px] border-accent-foreground focus:border-colored-primary focus:ring-0">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground border-accent-foreground">
                      <SelectItem value="all">All Types</SelectItem>
                      {THREAT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getThreatTypeShortLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold px-1">Sort By</label>
                  <Select
                    value={queryParams.sortBy || "createdAt"}
                    onValueChange={handleSortChange}
                  >
                    <SelectTrigger className="w-[150px] border-accent-foreground focus:border-colored-primary focus:ring-0">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground border-accent-foreground">
                      <SelectItem value="createdAt">Date Created</SelectItem>
                      <SelectItem value="confidenceScore">Confidence Score</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative flex-1 w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search threats..."
                    value={searchTerm}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className="pl-10 h-10 w-full xl:w-[200px] 2xl:w-[250px] border-accent-foreground focus:border-colored-primary focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
            {threatsResponse.data.map((threat) => (
              <ThreatCard key={threat.id} threat={threat} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && threatsResponse?.data.length === 0 && (
        <StatusMessage
          height="auto"
          classNames="flex-grow align-start mb-8"
          info="No threats found."
        />
      )}

      {!isLoading && threatsResponse && threatsResponse.pagination.totalPages > 1 && (
        <Pagination
          currentPage={threatsResponse.pagination.currentPage}
          totalPages={threatsResponse.pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
