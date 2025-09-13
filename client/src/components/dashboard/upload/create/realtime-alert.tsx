"use client";

import { Badge } from "@/components/ui/badge";
import moment from "moment";
import React from "react";
import { useUpload } from "@/context/UploadContext";
import { StatusMessage } from "@/components/common/status-message";

export const RealTimeAlerts = () => {
  const { alerts, completedUploads } = useUpload();

  const latestCompleted = Array.from(completedUploads.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  return (
    <div className="px-2 space-y-6">
      {latestCompleted && (
        <div className="p-5 bg-tableHover rounded-lg border border-accent-foreground shadow-sm">
          <h2 className="text-base font-semibold text-primary mb-3">Upload Analysis Complete</h2>
          <p className="text-sm text-primary-foreground mb-4">
            Found{" "}
            <span className="font-semibold text-primary">{latestCompleted.threats.length}</span>{" "}
            threats in{" "}
            <span className="font-semibold text-primary">
              {latestCompleted.summary.recordsAnalyzed}
            </span>{" "}
            records.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-primary-foreground border-t border-accent-foreground pt-3">
            <div>
              <span className="font-medium">Upload ID: </span>
              {latestCompleted.uploadId.substring(0, 8)}...
            </div>
            <div>
              <span className="font-medium">Time: </span>
              {moment(latestCompleted.timestamp).format("YYYY-MM-DD HH:mm")}
            </div>
          </div>
        </div>
      )}
      {alerts.length === 0 ? (
        <StatusMessage info="No alerts found" height={"calc(100vh - 400px)"} />
      ) : (
        <div
          className="grid grid-cols-1 2xl:grid-cols-2 gap-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 400px)" }}
        >
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-5 shadow-sm bg-foreground rounded-lg border border-accent-foreground hover:border-colored-primary cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-base font-semibold text-primary">{alert.title}</h2>
                {alert.severity && (
                  <Badge className="text-colored-primary bg-colored-shadow border border-colored-primary px-2 py-1 shadow-none capitalize">
                    {alert.severity}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-primary-foreground mb-4">{alert.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-primary-foreground border-t border-accent-foreground pt-4">
                <div>
                  <span className="font-medium">Time: </span>
                  {moment(alert.createdAt).format("YYYY-MM-DD HH:mm")}
                </div>
                {alert.id && (
                  <div>
                    <span className="font-medium">Alert ID: </span>
                    {alert.id.substring(0, 8)}...
                  </div>
                )}
                {alert.threatId && (
                  <div>
                    <span className="font-medium">Threat ID: </span>
                    {alert.threatId.substring(0, 8)}...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
