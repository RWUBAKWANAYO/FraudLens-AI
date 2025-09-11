// components/dashboard/users/invite-user.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@mui/material";
import { useState } from "react";
import { User, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteUserSchema, type InviteUserFormData } from "@/lib/zod-schemas/users";
import { useInviteUser } from "@/hooks/useUsers";

export function InviteUser() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate: inviteUser, isPending, error, reset } = useInviteUser();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      role: "MEMBER",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = (data: InviteUserFormData) => {
    inviteUser(data, {
      onSuccess: () => {
        resetForm();
        setIsModalOpen(false);
      },
    });
  };

  const handleModalClose = () => {
    resetForm();
    reset();
    setIsModalOpen(false);
  };

  return (
    <div className="w-full sm:w-auto">
      <Modal
        open={isModalOpen}
        onClose={handleModalClose}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Card className="w-full max-w-md shadow-lg border-none bg-foreground">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Invite new user</CardTitle>
            <CardDescription>Send an invitation to join your team</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error.message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  {...register("email")}
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setValue("role", value as InviteUserFormData["role"])}
                >
                  <SelectTrigger className="border-accent-foreground focus:border-colored-primary focus:ring-colored-primary">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-foreground border-accent-foreground">
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
              </div>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-colored-primary text-white colored-button"
              >
                <Mail className="h-4 w-4 mr-2" />
                {isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Modal>
      <Button
        className="w-full sm:w-auto colored-button bg-colored-primary text-white font-semibold"
        onClick={() => setIsModalOpen(true)}
      >
        <User className="h-4 w-4 mr-2" /> Invite New User
      </Button>
    </div>
  );
}
