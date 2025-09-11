"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type StatusMessageProps = {
  isLoading?: boolean;
  error?: Error | string | null;
  height?: string | number;
  width?: string | number;
  classNames?: string;
};

export const ErrorCard: React.FC<StatusMessageProps> = ({ error, classNames = "" }) => {
  return (
    <div
      className={`bg-shadow-red text-sm border border-primary-red text-primary-red px-4 py-3 rounded ${classNames}`}
    >
      {typeof error === "string" ? error : error?.message || "Something went wrong"}
    </div>
  );
};
export const StatusMessage: React.FC<StatusMessageProps> = ({
  isLoading = false,
  error = null,
  height = "100%",
  width = "100%",
  classNames = "bg-foreground",
}) => {
  if (isLoading) {
    return (
      <div
        className={`rounded-lg p-4 sm:p-6 space-y-6 flex items-center justify-center ${classNames}`}
        style={{ height, width }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg p-4 sm:p-6 space-y-6 flex items-center justify-center ${classNames}`}
        style={{ height, width }}
      >
        <ErrorCard error={error} />
      </div>
    );
  }

  return null;
};
