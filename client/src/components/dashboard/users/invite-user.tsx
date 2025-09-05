"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@mui/material";
import { useState } from "react";
import { User, Mail, Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InviteUserProps = {
  onUserInvite: (email: string, role: string) => void;
};

export function InviteUser({ onUserInvite }: InviteUserProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && role) {
      onUserInvite(email, role);
      setEmail("");
      setRole("member");
      setIsModalOpen(false);
    }
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
            <CardTitle className="text-2xl font-bold text-primary">Invite new user</CardTitle>
            <CardDescription>Send an invitation to join your team</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
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
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
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
