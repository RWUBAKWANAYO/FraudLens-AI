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

type EditUserRoleProps = {
  userId: string;
  userName: string;
  currentRole: string;
  onRoleUpdate: (userId: string, newRole: string) => void;
};

export function EditUserRole({ userId, userName, currentRole, onRoleUpdate }: EditUserRoleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRoleUpdate(userId, selectedRole);
    setIsModalOpen(false);
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative">
              <div className="grid gap-3">
                <Label htmlFor="role">Select Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="border-accent-foreground focus:border-colored-primary focus:ring-colored-primary">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-foreground border-accent-foreground">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-colored-primary text-white colored-button">
                <Edit className="h-4 w-4 mr-2" />
                Update Role
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
