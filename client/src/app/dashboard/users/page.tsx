"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditUserRole } from "@/components/dashboard/users/edit-user-role";
import { RemoveUser } from "@/components/dashboard/users/remove-user";
import { InviteUser } from "@/components/dashboard/users/invite-user";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "member";
  avatar?: string;
  joinedAt: string;
  lastActive: string;
  status: "active" | "inactive" | "suspended";
};

const usersData: User[] = [
  {
    id: "USR-1001",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    role: "admin",
    joinedAt: "2024-01-15",
    lastActive: "2025-09-05 14:30",
    status: "active",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
  {
    id: "USR-1002",
    name: "Michael Chen",
    email: "michael.chen@company.com",
    role: "manager",
    joinedAt: "2024-02-20",
    lastActive: "2025-09-05 10:15",
    status: "active",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
  {
    id: "USR-1003",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@example.org",
    role: "member",
    joinedAt: "2024-03-10",
    lastActive: "2025-09-04 16:45",
    status: "active",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  },
];

export default function UsersListPage() {
  const handleRoleUpdate = (userId: string, newRole: string) => {
    console.log("Updating role for user:", userId, "to:", newRole);
    // Implement role update logic here
  };

  const handleUserRemove = (userId: string) => {
    console.log("Removing user:", userId);
    // Implement user removal logic here
  };

  const handleUserInvite = (email: string, role: string) => {
    console.log("Inviting user:", email, "with role:", role);
    // Implement user invitation logic here
  };

  return (
    <div
      className="bg-foreground rounded-lg p-4 sm:p-6 space-y-6"
      style={{ minHeight: "calc(100vh - 140px)" }}
    >
      <div className="w-full flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between mb-4">
        <h2 className="text-xl font-bold">User Management</h2>
        <InviteUser onUserInvite={handleUserInvite} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {usersData.map((user) => (
          <Card
            key={user.id}
            className="border border-accent-foreground shadow-sm bg-foreground overflow-hidden"
          >
            <CardContent className="space-y-4 p-0">
              <div className="flex flex-col sm:flex-row gap-4">
                <Avatar className="h-[175px] w-full sm:w-[175px] rounded-lg">
                  <AvatarImage
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                  <AvatarFallback className="rounded-lg text-primary font-bold bg-accent">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="pl-4 sm:pl-0 py-4 pr-4 flex-1">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                    <h2
                      className={`text-sm font-bold ${
                        user.role === "admin"
                          ? "text-primary-blue"
                          : user.role === "manager"
                          ? "text-primary-green"
                          : "text-primary-purple"
                      }`}
                    >
                      {user.role}
                    </h2>
                    <p className="text-sm">
                      Joined: {new Date(user.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="pt-3 grid grid-cols-2 gap-2">
                    <EditUserRole
                      userId={user.id}
                      userName={user.name}
                      currentRole={user.role}
                      onRoleUpdate={handleRoleUpdate}
                    />
                    <RemoveUser
                      userId={user.id}
                      userName={user.name}
                      onUserRemove={handleUserRemove}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
