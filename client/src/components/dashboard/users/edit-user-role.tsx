"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Modal } from "@mui/material";
import { useState } from "react";
import { Edit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editUserRoleSchema, type EditUserRoleFormData } from "@/lib/zod-schemas/users";
import { useEditUserRole, User } from "@/hooks/useUsers";

type EditUserRoleProps = {
  userId: string;
  userName: string;
  currentRole: string;
};

export function EditUserRole({ userId, userName, currentRole }: EditUserRoleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate: editUserRole, isPending, error } = useEditUserRole();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditUserRoleFormData>({
    resolver: zodResolver(editUserRoleSchema),
    defaultValues: {
      role: currentRole as User["role"],
    },
  });

  const selectedRole = watch("role");

  const onSubmit = (data: EditUserRoleFormData) => {
    editUserRole(
      { userId, role: data.role },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      }
    );
  };

  return (
    <div className="w-full">
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Card className="w-full max-w-md shadow-lg border-none bg-foreground">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Edit user role</CardTitle>
            <CardDescription>Update role for {userName}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error.message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 relative">
              <div className="grid gap-3">
                <Label htmlFor="role">Select Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) =>
                    setValue("role", value as EditUserRoleFormData["role"], {
                      shouldValidate: true,
                    })
                  }
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
                <Edit className="h-4 w-4 mr-2" />
                {isPending ? "Updating..." : "Update Role"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Modal>
      <Button
        size="sm"
        className="gap-x-2 colored-button bg-colored-primary text-white font-semibold w-full"
        onClick={() => setIsModalOpen(true)}
      >
        <Edit className="h-4 w-4" />
        <span>Edit</span>
      </Button>
    </div>
  );
}
