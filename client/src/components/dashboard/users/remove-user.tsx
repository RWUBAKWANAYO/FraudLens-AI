"use client";

import { ModalMessageCard } from "@/components/ui/modal-message";
import React from "react";
import { Modal } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type RemoveUserProps = {
  userId: string;
  userName: string;
  onUserRemove: (userId: string) => void;
};

export const RemoveUser = ({ userId, userName, onUserRemove }: RemoveUserProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const deleteHandler = () => {
    onUserRemove(userId);
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="w-full">
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <ModalMessageCard
          title="Remove User"
          message={`Are you sure you want to remove ${userName}? This action cannot be undone.`}
          actionButtonName="Remove User"
          actionButtonStyle={"bg-red-500 text-white"}
          cancelButtonHandler={() => setIsDeleteModalOpen(false)}
          actionButtonHandler={deleteHandler}
        />
      </Modal>
      <Button
        size="sm"
        className="w-full colored-button text-colored-primary border border-colored-primary bg-transparent font-semibold"
        onClick={() => setIsDeleteModalOpen(true)}
      >
        <Trash2 className="h-4 w-4" /> Remove
      </Button>
    </div>
  );
};
