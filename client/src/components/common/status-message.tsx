"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type StatusMessageProps = {
  isLoading?: boolean;
  error?: Error | string | null;
  res?: any;
  height?: string | number;
  width?: string | number;
  classNames?: string;
  info?: string;
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
export const SuccessCard: React.FC<StatusMessageProps> = ({ res, classNames = "" }) => {
  return (
    <div
      className={`bg-shadow-green text-sm border border-primary-green text-primary-green px-4 py-3 rounded ${classNames}`}
    >
      {typeof res === "string" ? res : res?.message || "Completed successfully"}
    </div>
  );
};

export const StatusMessage: React.FC<StatusMessageProps> = ({
  isLoading = false,
  error = null,
  info,
  height = "100%",
  width = "100%",
  classNames = "bg-foreground items-center",
}) => {
  if (isLoading) {
    return (
      <div
        className={`rounded-lg p-4 sm:p-6 flex justify-center ${classNames}`}
        style={{ height, width }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg p-4 sm:p-6 flex justify-center ${classNames}`}
        style={{ height, width }}
      >
        <ErrorCard error={error} />
      </div>
    );
  }

  if (info) {
    return (
      <div
        className={`rounded-lg p-4 sm:p-6 flex justify-center ${classNames}`}
        style={{ height, width }}
      >
        <p className="text-sm text-primary">{info}</p>
      </div>
    );
  }

  return null;
};
