"use client";

import { Card } from "@/components/ui/card";
import users from "@/../public/assets/users.svg";
import files from "@/../public/assets/files.svg";
import frauds from "@/../public/assets/frauds.svg";
import uploadNew from "@/../public/assets/upload-new.svg";
import Image from "next/image";
import Link from "next/link";
import { useStats } from "@/hooks/useStats";
import { StatusMessage } from "@/components/common/status-message";

export function StatsCards() {
  const { data: stats, isLoading, error } = useStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="p-6 bg-foreground border-0 shadow-sm">
        {(isLoading || error) && (
          <StatusMessage
            isLoading={isLoading}
            error={error?.message || error || "Failed to load statistics"}
            height={"100%"}
            classNames="bg-foreground items-center"
          />
        )}
        {stats && (
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full">
                  <Image src={users} alt="users" width={60} height={60} className="w-[60px]" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary">{stats?.users.total || 0}</p>
                  <p className="text-sm font-medium text-primary-foreground">Total Users</p>
                </div>
              </div>
              <p className="text-sm font-medium">
                <span className="text-primary-green mr-2">
                  +{stats?.users.newSinceLastMonth || 0}
                </span>
                <span className="text-primary">New members since last month</span>
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-foreground border-0 shadow-sm">
        {(isLoading || error) && (
          <StatusMessage
            isLoading={isLoading}
            error={error?.message || error || "Failed to load statistics"}
            height={"100%"}
            classNames="bg-foreground items-center"
          />
        )}
        {stats && (
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full">
                  <Image src={files} alt="files" width={60} height={60} className="w-[60px]" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary">{stats?.files.total || 0}</p>
                  <p className="text-sm font-medium text-primary-foreground">Files Uploaded</p>
                </div>
              </div>
              <p className="text-sm font-medium">
                <span className="text-primary-blue mr-2">
                  +{stats?.files.newSinceLastMonth || 0}
                </span>
                <span className="text-primary">Uploaded since last month</span>
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-foreground border-0 shadow-sm">
        {(isLoading || error) && (
          <StatusMessage
            isLoading={isLoading}
            error={error?.message || error || "Failed to load statistics"}
            height={"100%"}
            classNames="bg-foreground items-center"
          />
        )}
        {stats && (
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full">
                  <Image src={frauds} alt="frauds" width={60} height={60} className="w-[60px]" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary">{stats?.frauds.total || 0}</p>
                  <p className="text-sm font-medium text-primary-foreground">Frauds Detected</p>
                </div>
              </div>
              <p className="text-sm font-medium">
                <span className="text-primary-red mr-2">
                  +{stats?.frauds.newSinceLastMonth || 0}
                </span>
                <span className="text-primary">Detected since last month</span>
              </p>
            </div>
          </div>
        )}
      </Card>

      <div className="bg-foreground rounded-lg">
        <Link
          href={"/dashboard/upload/create"}
          className="p-6 border-2 border-dashed border-colored-primary shadow-sm bg-foreground rounded-lg flex flex-col items-center cursor-pointer hover:bg-colored-shadow"
        >
          <Image src={uploadNew} alt="upload new" width={60} height={60} className="w-[60px]" />
          <h1 className="text-base font-semibold text-primary mt-4">Upload new file to analyze</h1>
        </Link>
      </div>
    </div>
  );
}
