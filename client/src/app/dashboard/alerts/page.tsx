"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { DateRangePicker } from "@/components/common/date-range";
import { Pagination } from "@/components/common/pagination";
import { AlertCard } from "@/components/alerts/alert-card";

const alerts = [
  {
    id: "TX1014",
    title: "Duplicate transaction",
    description: "Transaction ID TX1014 matches 11 previous records. Cluster value: USD 200.00.",
  },
  {
    id: "TX2021",
    title: "High-value anomaly",
    description:
      "Transaction ID TX2021 flagged for exceeding normal limits. Amount: USD 15,000.00.",
  },
  {
    id: "TX3098",
    title: "Suspicious location",
    description:
      "Transaction ID TX3098 originated from Lagos, Nigeria. Previous activity location: Paris, France.",
  },
  {
    id: "TX4102",
    title: "Velocity alert",
    description:
      "Transaction ID TX4102 is the 5th attempt within 2 minutes. Total attempted value: USD 1,200.00.",
  },
  {
    id: "TX5187",
    title: "Blacklisted account",
    description:
      "Transaction ID TX5187 involves a sender flagged in watchlist. Amount: USD 750.00.",
  },
  {
    id: "TX6244",
    title: "Multiple card usage",
    description:
      "Transaction ID TX6244 uses card linked to 3 different user accounts within 24 hours.",
  },
  {
    id: "TX7350",
    title: "Geographic mismatch",
    description:
      "Transaction ID TX7350 attempted in London while user’s device shows New York activity.",
  },
  {
    id: "TX8422",
    title: "Unusual merchant",
    description: "Transaction ID TX8422 processed at unregistered merchant. Amount: USD 420.00.",
  },
];

export default function UploadHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileSort, setFileSort] = useState("allFile");
  const [page, setPage] = useState(1);

  return (
    <div
      className="bg-foreground rounded-lg p-4 sm:p-6 flex flex-col gap-4"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      <h2 className="text-lg font-bold">Fraud Alert List</h2>
      <div className="w-full flex-grow space-y-8 overflow-auto">
        <div className="w-full flex flex-col xl:flex-row items-start xl:items-end justify-between gap-4">
          <DateRangePicker
            title="Date Range"
            startDate={new Date("2025-06-01")}
            endDate={new Date("2025-06-10")}
            onChange={(range) => {
              console.log("Range changed:", range);
            }}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full xl:w-fit">
            <div className="space-y-3">
              <label className="text-sm font-medium px-1">Sort By</label>
              <Select value={fileSort} onValueChange={setFileSort}>
                <SelectTrigger className="w-[200px] bg-foreground border-accent-foreground focus:border-colored-primary focus:ring-colored-primary">
                  <SelectValue placeholder="All File" />
                </SelectTrigger>
                <SelectContent className="bg-foreground border-accent-foreground">
                  <SelectItem value="allFile">All File</SelectItem>
                  <SelectItem value="fileName">File Name</SelectItem>
                  <SelectItem value="fileType">File Type</SelectItem>
                  <SelectItem value="fileSize">File Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search files"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 w-full xl:w-80 bg-foreground border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2  2xl:grid-cols-3 gap-4">
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
          ))}
        </div>
      </div>
      <Pagination currentPage={page} totalPages={60} onPageChange={setPage} />
    </div>
  );
}
