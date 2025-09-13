"use client";

import { UploadProgress } from "@/context/types";
import { cn } from "@/lib/utils";

type Props = {
  progress: number;
  stage: string | null;
  latestUpload?: UploadProgress;
};

export default function FileProgress({ progress, stage, latestUpload }: Props) {
  return (
    <div className="w-full space-y-4 p-4 border border-accent-foreground shadow-sm rounded-lg">
      <div className="w-full flex items-center gap-4">
        <div className="flex-1 h-8 p-1 border-2 border-colored-primary rounded-full overflow-hidden relative">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-in-out bg-colored-primary relative rounded-full overflow-hidden",
              progress === 0 && "animate-pulse"
            )}
            style={{ width: `${progress}%` }}
          >
            <div
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-[move_1s_linear_infinite]"
              style={{
                backgroundSize: "100% 100%",
                backgroundPosition: "-100% 0",
              }}
            />
          </div>
        </div>
        <span className="font-bold text-base">{progress}%</span>
      </div>
      {!latestUpload && stage === "initial" && (
        <div className="w-full flex items-center justify-between gap-2 border-t border-accent-foreground p-2">
          <span className="text-sm font-semibold text-primary">Initializing...</span>
        </div>
      )}
      {latestUpload?.details && (
        <div className="w-full flex flex-col">
          {latestUpload.details?.recordsProcessed && (
            <div className="w-full flex items-center justify-between gap-2 border-t border-accent-foreground p-2">
              <span className="text-sm font-semibold text-primary">Records</span>
              <span className="text-sm font-extrabold text-primary">
                {latestUpload.details?.recordsProcessed}/{latestUpload.details?.totalRecords}
              </span>
            </div>
          )}
          {latestUpload.details?.currentBatch && (
            <div className="w-full flex items-center justify-between gap-2 border-t border-accent-foreground p-2">
              <span className="text-sm font-semibold text-primary">Batch</span>
              <span className="text-sm font-extrabold text-primary">
                {latestUpload.details?.currentBatch}/{latestUpload.details?.totalBatches}
              </span>
            </div>
          )}
          {latestUpload.details?.threatsFound !== undefined && (
            <div className="w-full flex items-center justify-between gap-2 border-t border-accent-foreground p-2">
              <span className="text-sm font-semibold text-primary">Threats Found</span>
              <span className="text-2xl font-black text-primary-red">
                {latestUpload.details?.threatsFound}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
