"use client";

import { ModalMessageCard } from "@/components/ui/modal-message";
import React from "react";
import { Modal } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type RemoveWebhookProps = {
  webhookId: string;
  webhookName: string;
};

export const RemoveWebhook = ({ webhookId, webhookName }: RemoveWebhookProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const deleteHandler = () => {
    console.log("Deleting webhook with ID:", webhookId);
    setIsDeleteModalOpen(false);
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
          actionButtonName="Delete Webhook"
          actionButtonStyle={"bg-red-500 text-white"}
          cancelButtonHandler={() => setIsDeleteModalOpen(false)}
          actionButtonHandler={deleteHandler}
        />
      </Modal>
      <Button
        size="sm"
        className="flex items-center colored-button gap-1 bg-foreground text-primary shadow-sm border border-accent w-[100px]"
        onClick={() => setIsDeleteModalOpen(true)}
      >
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
    </div>
  );
};
