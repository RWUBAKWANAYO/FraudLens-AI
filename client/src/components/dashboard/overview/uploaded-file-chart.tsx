"use client";

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
import { useStats } from "@/hooks/useStats";
import { StatusMessage } from "@/components/common/status-message";

export const description = "A radial chart showing uploaded file types";

const chartConfig = {
  total: {
    label: "",
    color: "transparent",
  },
  csv: {
    label: "CSV",
    color: "var(--primary-blue)",
  },
  pdf: {
    label: "PDF",
    color: "var(--primary-red)",
  },
  excel: {
    label: "Excel",
    color: "var(--primary-green)",
  },
  json: {
    label: "JSON",
    color: "var(--primary-purple)",
  },
} satisfies ChartConfig;

export function UploadedFilesChart() {
  const { data: stats, isLoading, error } = useStats();

  if (isLoading || error || !stats) {
    return (
      <Card className="flex flex-col bg-foreground border-0 shadow-sm h-full min-h-[420px]">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-lg font-bold">Uploaded Files Chart</CardTitle>
          <CardDescription>All files uploaded and accepted by the system</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <StatusMessage
            isLoading={isLoading}
            error={error}
            height={"calc(100% - 70px)"}
            classNames="bg-foreground items-center"
          />
        </CardContent>
      </Card>
    );
  }

  const { byType } = stats.files;

  const totalFiles = byType.csv + byType.pdf + byType.excel + byType.json + byType.other;
  const maxValue = Math.max(totalFiles, 100);

  const chartData = [
    { file: "total", visitors: maxValue + 50, fill: "transparent" },
    { file: "json", visitors: byType.json, fill: chartConfig.json.color },
    { file: "excel", visitors: byType.excel, fill: chartConfig.excel.color },
    { file: "pdf", visitors: byType.pdf, fill: chartConfig.pdf.color },
    { file: "csv", visitors: byType.csv, fill: chartConfig.csv.color },
  ];

  return (
    <Card className="flex flex-col bg-foreground border-0 shadow-sm h-full min-h-[420px]">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg font-bold">Uploaded Files Chart</CardTitle>
        <CardDescription>All files uploaded and accepted by the system</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <RadialBarChart
            data={chartData}
            innerRadius={30}
            outerRadius={100}
            startAngle={90}
            endAngle={450}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="file" />}
            />
            <RadialBar dataKey="visitors" background />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col text-sm">
        <div className="grid grid-cols-5 gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-blue"></div>
              <span className="text-sm text-primary-foreground">CSV:</span>
            </div>
            <span className="text-sm font-semibold text-primary">{byType.csv}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-red"></div>
              <span className="text-sm text-primary-foreground">PDF:</span>
            </div>
            <span className="text-sm font-semibold text-primary">{byType.pdf}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-green"></div>
              <span className="text-sm text-primary-foreground">XLSL:</span>
            </div>
            <span className="text-sm font-semibold text-primary">{byType.excel}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-purple"></div>
              <span className="text-sm text-primary-foreground">JSON:</span>
            </div>
            <span className="text-sm font-semibold text-primary">{byType.json}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
