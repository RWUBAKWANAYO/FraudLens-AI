"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useThreats } from "@/hooks/useThreats";
import { StatusMessage } from "@/components/common/status-message";
import { formatThreatType, getSeverity } from "@/lib/utils";
import moment from "moment";

export function RecentFraud() {
  const {
    data: threatsResponse,
    isLoading,
    error,
  } = useThreats({
    page: 1,
    limit: 5,
    sortOrder: "desc",
  });
  console.log("threatsResponse", threatsResponse);
  return (
    <div className="w-full bg-foreground rounded-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recent Fraud Attempts</h2>
        <Button className="colored-button text-colored-primary shadow-none bg-transparent font-semibold">
          View All
        </Button>
      </div>
      {(isLoading || error) && (
        <StatusMessage
          isLoading={isLoading}
          error={error}
          height={"calc(100% - 70px)"}
          classNames="bg-foreground items-center"
        />
      )}
      {threatsResponse?.data.length === 0 && (
        <StatusMessage
          info="No files uploaded yet"
          height={"calc(100% - 70px)"}
          classNames="bg-foreground items-center"
        />
      )}
      {threatsResponse?.data && threatsResponse?.data?.length > 0 && (
        <div className="overflow-hidden rounded-md border border-accent">
          <Table className="min-w-[700px]">
            <TableHeader className="bg-tableHover">
              <TableRow className="border-accent text-primary">
                <TableHead className="py-4 text-primary font-bold">Transaction ID</TableHead>
                <TableHead className="py-4 text-primary font-bold">Amount</TableHead>
                <TableHead className="py-4 text-primary font-bold">Threat type</TableHead>
                <TableHead className="py-4 text-primary font-bold">Severity</TableHead>
                <TableHead className="py-4 text-primary font-bold">Uploaded</TableHead>
                <TableHead className="py-4 text-primary font-bold">Detected At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {threatsResponse?.data.map((fraud) => (
                <TableRow
                  key={fraud.id}
                  className="border-b border-accent font-normal hover:bg-tableHover transition-colors"
                >
                  <TableCell className="py-4">{fraud.metadata?.aiContext?.txId}</TableCell>
                  <TableCell className="py-4">{fraud.metadata?.aiContext?.amount}</TableCell>
                  <TableCell className="py-4">
                    {formatThreatType(fraud.metadata?.aiContext?.threatType || "")}
                  </TableCell>
                  <TableCell
                    className={`py-4 capitalize ${getSeverity(fraud.confidenceScore).className}`}
                  >
                    {getSeverity(fraud.confidenceScore).severity}
                  </TableCell>
                  <TableCell className="py-4">{fraud.upload?.fileName}</TableCell>
                  <TableCell className="py-4">
                    {moment(fraud.createdAt).format("yyyy-MM-DD HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
