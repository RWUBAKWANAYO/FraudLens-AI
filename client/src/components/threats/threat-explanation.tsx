"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@mui/material";
import { useState } from "react";
import { Brain } from "lucide-react";
import { useThreatDetails } from "@/hooks/useThreats";
import { Threat } from "@/types/threat";
import moment from "moment";
import { StatusMessage } from "../common/status-message";

interface ThreatExplanationProps {
  threat: Threat;
}

export function ThreatExplanation({ threat }: ThreatExplanationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    data: threatDetails,
    isLoading,
    error,
  } = useThreatDetails(threat.id, { enabled: isModalOpen });

  const aiExplanation = threatDetails?.metadata?.aiExplanation || "";

  const handleSubmit = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="">
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="p-6 space-y-4 border border-accent-foreground rounded-lg bg-foreground shadow-sm w-full sm:w-[700px] max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Threat Analysis
            </h2>
            <p className="text-sm font-medium text-primary-foreground">
              {moment(threat.createdAt).fromNow()}
            </p>
          </div>

          {(isLoading || error) && (
            <StatusMessage isLoading={isLoading} error={error} classNames="text-center" />
          )}

          {aiExplanation && (
            <>
              <div className="p-4 bg-accent rounded-md">
                <p className="text-primary text-sm whitespace-pre-wrap">{aiExplanation}</p>
              </div>

              {threatDetails?.metadata?.aiGeneratedAt && (
                <div className="text-xs text-muted-foreground text-right">
                  Generated at:{" "}
                  {moment(threatDetails.metadata.aiGeneratedAt).format("MMMM Do YYYY")}
                </div>
              )}
            </>
          )}

          {!isLoading && !error && !aiExplanation && (
            <div className="text-muted-foreground text-center py-8">
              No AI explanation available for this threat.
            </div>
          )}
        </div>
      </Modal>
      <Button
        type="button"
        onClick={handleSubmit}
        className="border border-colored-primary colored-button rounded-sm shadow-none text-colored-primary bg-transparent flex items-center gap-2"
      >
        <Brain className="h-4 w-4" />
        Explain with AI
      </Button>
    </div>
  );
}
