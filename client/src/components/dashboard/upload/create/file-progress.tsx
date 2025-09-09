"use client";

import { cn } from "@/lib/utils";

type Props = {
  progress: number;
  stage: string | null;
};

export default function FileProgress({ progress, stage }: Props) {
  return (
    <div className="w-full space-y-4 pt-2">
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
        <span className="font-semibold text-base">{progress}%</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-medium text-primary">Detected threat: {stage}</span>
        <span className="text-lg font-bold text-primary-red">5</span>
      </div>
    </div>
  );
}
