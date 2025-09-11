"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Power, Loader2Icon, Globe } from "lucide-react";
import { RemoveWebhook } from "@/components/dashboard/webhooks/remove-webhook";
import { CopyableCell } from "@/components/dashboard/webhooks/copyable-cell";
import { CreateWebhook } from "@/components/dashboard/webhooks/create-webhook";
import { useWebhooks, useUpdateWebhook } from "@/hooks/useWebhooks";
import moment from "moment";
import { StatusMessage } from "@/components/common/status-message";

const eventLabels: Record<string, string> = {
  "threat.created": "Threat Created",
  "upload.complete": "Upload Complete",
  "transaction.created": "Transaction Created",
  "transaction.updated": "Transaction Updated",
  "chargeback.created": "Chargeback Created",
  "refund.processed": "Refund Processed",
};

export default function WebhooksList() {
  const { data: webhooks, isLoading, error } = useWebhooks();
  const updateWebhookMutation = useUpdateWebhook();

  const toggleWebhookStatus = async (webhookId: string, currentStatus: boolean) => {
    updateWebhookMutation.mutate({
      id: webhookId,
      data: { active: !currentStatus },
    });
  };

  const formatEvents = (events: string[]) => {
    return events.map((event) => eventLabels[event] || event).join(", ");
  };

  if (isLoading || error) {
    return <StatusMessage isLoading={isLoading} error={error} height="calc(100vh - 120px)" />;
  }

  return (
    <div className="bg-foreground rounded-lg p-6" style={{ minHeight: "calc(100vh - 120px)" }}>
      <div className="w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Webhooks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage webhook subscriptions for real-time event notifications
          </p>
        </div>
        <CreateWebhook />
      </div>

      <div className="w-full overflow-hidden rounded-md border border-accent">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-tableHover">
            <TableRow className="border-accent text-primary">
              <TableHead className="py-4 text-primary font-bold">Name</TableHead>
              <TableHead className="py-4 text-primary font-bold">URL</TableHead>
              <TableHead className="py-4 text-primary font-bold">Events</TableHead>
              <TableHead className="py-4 text-primary font-bold">Secret</TableHead>
              <TableHead className="py-4 text-primary font-bold">Status</TableHead>
              <TableHead className="py-4 text-primary font-bold whitespace-nowrap">
                Last Delivery
              </TableHead>
              <TableHead className="py-4 text-primary font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {webhooks?.map((webhook) => {
              const isLoading =
                updateWebhookMutation.isPending &&
                updateWebhookMutation.variables?.id === webhook.id;

              return (
                <TableRow key={webhook.id} className="border-b border-accent hover:bg-tableHover">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {webhook.name}
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <CopyableCell value={webhook.url} />
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="max-w-[200px]">
                      <span className="text-sm line-clamp-2" title={formatEvents(webhook.events)}>
                        {formatEvents(webhook.events)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <CopyableCell value={webhook.secret} maskable defaultVisible={false} />
                  </TableCell>

                  <TableCell className="py-4">
                    <div
                      className={`font-medium text-center py-[2px] px-2 w-fit rounded-full capitalize ${
                        webhook.active
                          ? "bg-badge-greenBg text-emerald-500 border border-badge-greenBorder"
                          : "bg-badge-redBg text-red-500 border border-badge-redBorder"
                      }`}
                    >
                      {webhook.active ? "active" : "inactive"}
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {webhook.lastDelivery ? (
                        <>
                          <span className="text-sm">
                            {moment(webhook.lastDelivery.createdAt).fromNow()}
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              webhook.lastDelivery.success ? "bg-emerald-500" : "bg-red-500"
                            }`}
                            title={webhook.lastDelivery.success ? "success" : "failed"}
                          />
                        </>
                      ) : (
                        <span className="text-sm">Never</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        className="flex items-center colored-button gap-1 bg-foreground text-primary shadow-sm border border-accent w-[120px]"
                        onClick={() => toggleWebhookStatus(webhook.id, webhook.active)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                        {webhook.active ? "Deactivate" : "Activate"}
                      </Button>
                      <RemoveWebhook webhookId={webhook.id} webhookName={webhook.name} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
