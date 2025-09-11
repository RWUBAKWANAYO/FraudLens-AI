"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditUserRole } from "@/components/dashboard/users/edit-user-role";
import { RemoveUser } from "@/components/dashboard/users/remove-user";
import { InviteUser } from "@/components/dashboard/users/invite-user";
import { useUsers } from "@/hooks/useUsers";
import moment from "moment";
import { StatusMessage } from "@/components/common/status-message";

export default function UsersListPage() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading || error) {
    return <StatusMessage isLoading={isLoading} error={error} height="calc(100vh - 120px)" />;
  }

  return (
    <div
      className="bg-foreground rounded-lg p-4 sm:p-6 space-y-6"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      <div className="w-full flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between mb-4">
        <h2 className="text-xl font-bold">User Management</h2>
        <InviteUser />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {users?.map((user) => (
          <Card
            key={user.id}
            className="border border-accent-foreground shadow-sm bg-foreground overflow-hidden"
          >
            <CardContent className="space-y-4 p-0">
              <div className="flex flex-col sm:flex-row gap-4">
                <Avatar className="h-[175px] w-full sm:w-[175px] rounded-lg">
                  <AvatarImage
                    src={user.avatar}
                    alt={user.fullName}
                    className="w-full h-full object-cover"
                  />
                  <AvatarFallback className="rounded-lg text-primary font-bold bg-accent">
                    {user.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="pl-4 sm:pl-0 py-4 pr-4 flex-1">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">{user.fullName}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                    <h2
                      className={`text-sm font-bold ${
                        user.role === "ADMIN"
                          ? "text-primary-blue"
                          : user.role === "MANAGER"
                          ? "text-primary-green"
                          : "text-primary-purple"
                      }`}
                    >
                      {user.role}
                    </h2>
                    <p className="text-sm">Joined: {moment(user.createdAt).format("YYYY-MM-DD")}</p>
                  </div>
                  <div className="pt-3 grid grid-cols-2 gap-2">
                    <EditUserRole
                      userId={user.id}
                      userName={user.fullName}
                      currentRole={user.role}
                    />
                    <RemoveUser userId={user.id} userName={user.fullName} />
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
