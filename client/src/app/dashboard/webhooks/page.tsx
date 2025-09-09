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

type WebhookEvent =
  | "transaction.created"
  | "transaction.updated"
  | "chargeback.created"
  | "refund.processed";

type Webhook = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  lastDelivery?: string;
  deliveryStatus?: "success" | "failed" | "pending";
};

const webhooksData: Webhook[] = [
  {
    id: "WH-1001",
    name: "Production Transactions",
    url: "https://api.merchant.com/webhooks/transactions",
    secret: "whsec_1234567890abcdef",
    events: ["transaction.created", "transaction.updated"],
    active: true,
    createdAt: "2025-08-20 10:22",
    lastDelivery: "2025-09-05 14:30",
    deliveryStatus: "success",
  },
  {
    id: "WH-1002",
    name: "Chargeback Alerts",
    url: "https://webhook.merchant.com/chargebacks",
    secret: "whsec_fedcba9876543210",
    events: ["chargeback.created"],
    active: true,
    createdAt: "2025-08-25 15:05",
    lastDelivery: "2025-09-04 16:45",
    deliveryStatus: "success",
  },
  {
    id: "WH-1003",
    name: "Refund Notifications",
    url: "https://notify.merchant.com/refunds",
    secret: "whsec_abcd1234efgh5678",
    events: ["refund.processed"],
    active: false,
    createdAt: "2025-09-01 08:45",
    lastDelivery: "2025-09-03 09:20",
    deliveryStatus: "failed",
  },
];

const eventLabels: Record<WebhookEvent, string> = {
  "transaction.created": "Transaction Created",
  "transaction.updated": "Transaction Updated",
  "chargeback.created": "Chargeback Created",
  "refund.processed": "Refund Processed",
};

export default function WebhooksList() {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});

  const toggleWebhookStatus = async (webhookId: string, currentStatus: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [webhookId]: true }));

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`Toggling webhook ${webhookId} to ${!currentStatus}`);

    setLoadingStates((prev) => ({ ...prev, [webhookId]: false }));
  };

  const formatEvents = (events: WebhookEvent[]) => {
    return events.map((event) => eventLabels[event]).join(", ");
  };

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
              <TableHead className="py-4 text-primary font-bold">Last Delivery</TableHead>
              <TableHead className="py-4 text-primary font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {webhooksData.map((webhook) => {
              const isLoading = loadingStates[webhook.id];

              return (
                <TableRow key={webhook.id} className="border-b border-accent hover:bg-tableHover">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
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
                    <div className="max-w-[250px]">
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
                    <div className="flex items-center gap-2">
                      {webhook.lastDelivery && (
                        <>
                          <span className="text-sm">
                            {new Date(webhook.lastDelivery).toLocaleDateString()}
                          </span>
                          {webhook.deliveryStatus && (
                            <div
                              className={`w-2 h-2 rounded-full ${
                                webhook.deliveryStatus === "success"
                                  ? "bg-emerald-500"
                                  : webhook.deliveryStatus === "failed"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                              }`}
                              title={webhook.deliveryStatus}
                            />
                          )}
                        </>
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
