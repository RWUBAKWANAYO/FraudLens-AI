import React from "react";
import { IThreat, ThreatExplanation } from "./threat-explanation";

export const ThreatCard = ({ threat }: { threat: IThreat }) => {
  return (
    <div className="p-4 space-y-2 border border-accent-foreground  rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-primary">{threat.title}</h2>
        <p className="text-sm font-medium text-primary-foreground">06 June 2023</p>
      </div>
      <p className="text-sm text-primary-foreground">{threat.description}</p>
      <div className="w-full flex justify-end">
        <ThreatExplanation threat={threat} />
      </div>
    </div>
  );
};
