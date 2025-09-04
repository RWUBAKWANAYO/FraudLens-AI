import { Card } from "@/components/ui/card";
import { Users, UserCheck, Heart, Building2 } from "lucide-react";
import users from "@/../public/assets/users.svg";
import files from "@/../public/assets/files.svg";
import frauds from "@/../public/assets/frauds.svg";
import uploadNew from "@/../public/assets/upload-new.svg";
import Image from "next/image";

const data = {
  totalUsers: 2937,
  newUsers: 342,
  totalFiles: 5432,
  newFiles: 164,
  totalFrauds: 170,
  newFrauds: 12,
  totalFileSize: 18375,
  newFileSize: 345,
};

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="p-6 bg-foreground border-0 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full`}>
                <Image src={users} alt="users" width={60} height={60} className="w-[60px]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-primary">{data.totalUsers}</p>
                <p className="text-sm font-medium text-primary-foreground">Total Users</p>
              </div>
            </div>
            <p className={`text-sm font-medium`}>
              <span className={`text-primary-green mr-2`}>{data.newUsers}</span>
              <span className={`text-primary`}>New members since last month</span>
            </p>
          </div>
        </div>
      </Card>
      <Card className="p-6 bg-foreground border-0 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full`}>
                <Image src={files} alt="files" width={60} height={60} className="w-[60px]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-primary">{data.totalFiles}</p>
                <p className="text-sm font-medium text-primary-foreground">Files Uploaded</p>
              </div>
            </div>
            <p className={`text-sm font-medium`}>
              <span className={`text-colored-primary mr-2`}>{data.newFiles}</span>
              <span className={`text-primary`}>Uploaded since last month</span>
            </p>
          </div>
        </div>
      </Card>
      <Card className="p-6 bg-foreground border-0 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full`}>
                <Image src={frauds} alt="frauds" width={60} height={60} className="w-[60px]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-primary">{data.totalUsers}</p>
                <p className="text-sm font-medium text-primary-foreground">Frauds Detected</p>
              </div>
            </div>
            <p className={`text-sm font-medium`}>
              <span className={`text-primary-red mr-2`}>{data.newUsers}</span>
              <span className={`text-primary`}>Detected since last month</span>
            </p>
          </div>
        </div>
      </Card>
      <div className="p-6 border-2 border-dashed border-colored-primary shadow-sm bg-foreground rounded-lg flex flex-col items-center cursor-pointer">
        <Image src={uploadNew} alt="upload new" width={60} height={60} className="w-[60px]" />
        <h1 className="text-base font-semibold text-primary mt-4">Upload new file to analyze</h1>
      </div>
    </div>
  );
}
