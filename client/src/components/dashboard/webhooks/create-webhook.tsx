"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@mui/material";
import { useState } from "react";
import { Globe, Bell, Plus, Loader2Icon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createWebhookSchema,
  type CreateWebhookFormData,
  type WebhookEvent,
} from "@/lib/zod-schemas/webhooks";
import { useCreateWebhook } from "@/hooks/useWebhooks";
import { ErrorCard } from "@/components/common/status-message";

const eventOptions: { value: WebhookEvent; label: string }[] = [
  { value: "threat.created", label: "Threat Created" },
  { value: "upload.complete", label: "Upload Complete" },
  { value: "upload.progress", label: "Upload Progress" },
];

export function CreateWebhook() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate: createWebhook, isPending, error } = useCreateWebhook();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateWebhookFormData>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: {
      events: [],
    },
  });

  const selectedEvents = watch("events") || [];

  const onSubmit = (data: CreateWebhookFormData) => {
    createWebhook(data, {
      onSuccess: () => {
        setIsModalOpen(false);
        reset();
      },
    });
  };

  const toggleEvent = (event: WebhookEvent) => {
    const newEvents = selectedEvents.includes(event)
      ? selectedEvents.filter((e) => e !== event)
      : [...selectedEvents, event];
    setValue("events", newEvents, { shouldValidate: true });
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
            {error && <ErrorCard error={error} classNames="mb-4" />}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">Webhook Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="ex: Production Transactions"
                  {...register("name")}
                  required
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="url">Endpoint URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-domain.com/webhooks"
                  {...register("url")}
                  required
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
                {errors.url && <p className="text-sm text-red-600">{errors.url.message}</p>}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="secret">Secret Key</Label>
                <Input
                  id="secret"
                  type="text"
                  placeholder="Enter secret key"
                  {...register("secret")}
                  required
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
                {errors.secret && <p className="text-sm text-red-600">{errors.secret.message}</p>}
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
                {errors.events && <p className="text-sm text-red-600">{errors.events.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-colored-primary text-white colored-button"
              >
                {isPending ? (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                {isPending ? "Creating..." : "Create Webhook"}
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
