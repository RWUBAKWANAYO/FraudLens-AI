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

type FraudCase = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  source: string;
};

const fraudData: FraudCase[] = [
  {
    id: "FR-20230901",
    type: "Phishing Attempt",
    severity: "high",
    detectedAt: "2025-09-01 14:22",
    source: "Email Gateway",
  },
  {
    id: "FR-20230902",
    type: "Credential Stuffing",
    severity: "critical",
    detectedAt: "2025-09-02 09:11",
    source: "Login API",
  },
  {
    id: "FR-20230903",
    type: "Suspicious File Upload",
    severity: "medium",
    detectedAt: "2025-09-02 17:40",
    source: "Dashboard",
  },
  {
    id: "FR-20230904",
    type: "Malware Distribution",
    severity: "high",
    detectedAt: "2025-09-03 08:59",
    source: "External Link",
  },
  {
    id: "FR-20230905",
    type: "SQL Injection",
    severity: "critical",
    detectedAt: "2025-09-03 12:33",
    source: "Reports API",
  },
];

export function RecentFraud() {
  return (
    <div className="w-full bg-foreground rounded-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recent Fraud Attempts</h2>
        <Button className="colored-button text-colored-primary shadow-none bg-transparent font-semibold">
          View All
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border border-accent">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-tableHover">
            <TableRow className="border-accent text-primary">
              <TableHead className="py-4 text-primary font-bold">Case ID</TableHead>
              <TableHead className="py-4 text-primary font-bold">Type</TableHead>
              <TableHead className="py-4 text-primary font-bold">Severity</TableHead>
              <TableHead className="py-4 text-primary font-bold">Detected At</TableHead>
              <TableHead className="py-4 text-primary font-bold">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fraudData.map((fraud) => (
              <TableRow
                key={fraud.id}
                className="border-b border-accent font-normal hover:bg-tableHover transition-colors"
              >
                <TableCell className="py-4">{fraud.id}</TableCell>
                <TableCell className="py-4">{fraud.type}</TableCell>
                <TableCell
                  className={`py-4 capitalize ${
                    fraud.severity === "critical"
                      ? "text-primary-blue"
                      : fraud.severity === "high"
                      ? "text-primary-red"
                      : fraud.severity === "medium"
                      ? "text-primary-green"
                      : "text-green-600"
                  }`}
                >
                  {fraud.severity}
                </TableCell>
                <TableCell className="py-4">{fraud.detectedAt}</TableCell>
                <TableCell className="py-4">{fraud.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
