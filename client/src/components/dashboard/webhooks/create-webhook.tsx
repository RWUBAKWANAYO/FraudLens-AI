"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@mui/material";
import { useState } from "react";
import { Globe, Bell, Shield, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type WebhookEvent =
  | "transaction.created"
  | "transaction.updated"
  | "chargeback.created"
  | "refund.processed";

const eventOptions: { value: WebhookEvent; label: string }[] = [
  { value: "transaction.created", label: "Transaction Created" },
  { value: "transaction.updated", label: "Transaction Updated" },
  { value: "chargeback.created", label: "Chargeback Created" },
  { value: "refund.processed", label: "Refund Processed" },
];

export function CreateWebhook() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating webhook:", { name, url, events: selectedEvents });
    setIsModalOpen(false);
    setName("");
    setUrl("");
    setSelectedEvents([]);
  };

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="w-full sm:w-auto">
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Card className="w-full max-w-md shadow-lg border-none bg-foreground">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <Globe className="h-6 w-6" />
              Create Webhook
            </CardTitle>
            <CardDescription>Set up a new webhook subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">Webhook Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="ex: Production Transactions"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="url">Endpoint URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-domain.com/webhooks"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
              </div>

              <div className="grid gap-3">
                <Label>Events to Subscribe</Label>
                <div className="space-y-3">
                  {eventOptions.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={event.value}
                        checked={selectedEvents.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <Label
                        htmlFor={event.value}
                        className="text-sm font-normal text-primary-foreground"
                      >
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full bg-colored-primary text-white colored-button">
                <Bell className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            </form>
          </CardContent>
        </Card>
      </Modal>
      <Button
        className="w-full colored-button bg-colored-primary text-white font-semibold"
        onClick={() => setIsModalOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Webhook
      </Button>
    </div>
  );
}
