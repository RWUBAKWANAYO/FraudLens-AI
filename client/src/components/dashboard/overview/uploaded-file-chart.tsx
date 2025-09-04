"use client";

import { TrendingUp } from "lucide-react";
import { RadialBar, RadialBarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "A radial chart";

const chartData = [
  { file: "total", visitors: 1000, fill: "transparent" },
  { file: "csv", visitors: 400, fill: "rgba(253, 107, 112, 1)" },
  { file: "pdf", visitors: 300, fill: "rgba(43, 158, 252, 1)" },
  { file: "xlsx", visitors: 200, fill: "rgba(253, 136, 47, 1)" },
  { file: "json", visitors: 100, fill: " rgba(45, 190, 195, 1)" },
];

const chartConfig = {
  total: {
    label: "",
    color: "transparent",
  },
  csv: {
    label: "CSV",
    color: "rgba(253, 107, 112, 1)",
  },
  pdf: {
    label: "PDF",
    color: " rgba(43, 158, 252, 1)",
  },
  xlsx: {
    label: "XLSX",
    color: "rgba(253, 136, 47, 1)",
  },
  json: {
    label: "JSON",
    color: "rgba(45, 190, 195, 1)",
  },
} satisfies ChartConfig;

export function UploadedFilesChart() {
  return (
    <Card className="flex flex-col bg-foreground border-0 shadow-sm h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg font-bold">Uploaded Files Chart</CardTitle>
        <CardDescription>
          A chart showing all file uploaded and accepted by the system
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={100}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="file" />}
            />
            <RadialBar dataKey="visitors" background />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col text-sm">
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#fd6b70]"></div>
              <span className="text-sm text-primary-foreground">CSV:</span>
            </div>
            <span className="text-sm font-semibold primary">300</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#2b9ffc]"></div>
              <span className="text-sm text-primary-foreground">PDF:</span>
            </div>
            <span className="text-sm font-semibold primary">200</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#fd892f]"></div>
              <span className="text-sm text-primary-foreground">XLSX:</span>
            </div>
            <span className="text-sm font-semibold primary">187</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#2dbfc3]"></div>
              <span className="text-sm text-primary-foreground">JSON:</span>
            </div>
            <span className="text-sm font-semibold primary">173</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
