"use client";

import { ModalMessageCard } from "@/components/ui/modal-message";
import React from "react";
import { Modal } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Loader2Icon, Trash2 } from "lucide-react";
import { useDeleteWebhook } from "@/hooks/useWebhooks";

type RemoveWebhookProps = {
  webhookId: string;
  webhookName: string;
};

export const RemoveWebhook = ({ webhookId, webhookName }: RemoveWebhookProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const { mutate: deleteWebhook, isPending, error } = useDeleteWebhook();

  const deleteHandler = () => {
    deleteWebhook(webhookId, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
      },
    });
  };

  return (
    <div>
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <ModalMessageCard
          title="Delete Webhook"
          message={`Are you sure you want to delete "${webhookName}"? This action cannot be undone.`}
          actionButtonName={isPending ? "Deleting..." : "Delete Webhook"}
          actionButtonStyle={"bg-red-500 text-white"}
          cancelButtonHandler={() => setIsDeleteModalOpen(false)}
          actionButtonHandler={deleteHandler}
          disabled={isPending}
          error={error?.message}
        />
      </Modal>
      <Button
        size="sm"
        className="flex items-center colored-button gap-1 bg-foreground text-primary shadow-sm border border-accent w-[100px]"
        onClick={() => setIsDeleteModalOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Delete
      </Button>
    </div>
  );
};
