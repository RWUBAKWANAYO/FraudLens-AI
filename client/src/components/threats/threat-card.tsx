import React from "react";
import { ThreatExplanation } from "./threat-explanation";
import { Threat } from "@/types/threat";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

interface ThreatCardProps {
  threat: Threat;
}

export const ThreatCard = ({ threat }: ThreatCardProps) => {
  const formatThreatType = (threatType: string) => {
    return threatType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="p-4 space-y-3 border border-accent-foreground rounded-lg shadow bg-foreground">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-primary">{formatThreatType(threat.threatType)}</h2>
        <Badge className="text-primary bg-accent-foreground px-2 py-1 shadow-none">
          {moment(threat.createdAt).fromNow()}
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-primary-foreground">{threat.description}</p>

        <div className="flex items-center justify-between text-sm text-primary-foreground">
          <span>Confidence: {(threat.confidenceScore * 100).toFixed(0)}%</span>
          <span>
            Amount: {threat.record.amount} {threat.record.currency}
          </span>
        </div>

        <div className="text-sm text-primary-foreground">Partner: {threat.record.partner}</div>

        <div className="text-sm text-primary-foreground">Upload: {threat.upload.fileName}</div>
      </div>

      <div className="w-full flex justify-end pt-2">
        <ThreatExplanation threat={threat} />
      </div>
    </div>
  );
};
