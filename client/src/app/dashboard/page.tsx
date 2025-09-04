import { StatsCards } from "@/components/dashboard/overview/stats-cards";
import { UploadedFilesChart } from "@/components/dashboard/overview/uploaded-file-chart";
import { RecentUsers } from "@/components/dashboard/overview/recent-users";
import { RecentFraud } from "@/components/dashboard/overview/recent-fraud";
import { RecentFiles } from "@/components/dashboard/overview/recent-files";

export default function Overview() {
  return (
    <div className="min-h-screen w-full p-6">
      <div className="max-w-8xl mx-auto space-y-4">
        <StatsCards />
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1">
            <RecentFiles />
          </div>
          <div className="w-full xl:w-[350px]">
            <RecentUsers />
          </div>
        </div>
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="w-full xl:w-[400px]">
            <UploadedFilesChart />
          </div>
          <div className="flex-1">
            <RecentFraud />
          </div>
        </div>
      </div>
    </div>
  );
}

