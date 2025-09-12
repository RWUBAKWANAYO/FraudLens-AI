"use client";

import { ModalMessageCard } from "@/components/ui/modal-message";
import React from "react";
import { Modal } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2Icon } from "lucide-react";
import { useDeleteApiKey } from "@/hooks/useApiKeys";

export const RemoveKey = ({ keyId, keyName }: { keyId: string; keyName: string }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const { mutate: deleteApiKey, isPending } = useDeleteApiKey();

  const deleteHandler = () => {
    deleteApiKey(keyId, {
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
          title="Delete API Key"
          message={`Are you sure you want to delete "${keyName}"? This action cannot be undone.`}
          actionButtonName={isPending ? "Deleting..." : "Delete Key"}
          actionButtonStyle={"bg-red-500 text-white"}
          cancelButtonHandler={() => setIsDeleteModalOpen(false)}
          actionButtonHandler={deleteHandler}
          disabled={isPending}
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
