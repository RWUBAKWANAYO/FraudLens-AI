"use client";

import { StatusMessage } from "@/components/common/status-message";
import { useUsers } from "@/hooks/useUsers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import moment from "moment";
import Link from "next/link";

export function RecentUsers() {
  const { data: users, isLoading, error } = useUsers();

  return (
    <div className="p-6 bg-foreground shadow-sm rounded-lg h-full min-h-[420px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recent members</h2>
        <Link
          href={"/dashboard/users"}
          className="colored-button text-colored-primary shadow-none bg-transparent font-semibold py-1.5 px-3 rounded-md text-sm"
        >
          View All
        </Link>
      </div>
      {(isLoading || error) && (
        <StatusMessage
          isLoading={isLoading}
          error={error}
          height={"calc(100% - 70px)"}
          classNames="bg-foreground items-center"
        />
      )}
      {users?.slice(0, 5).map((user) => (
        <div
          className="mb-2 pb-4  border-b border-accent flex justify-between"
          key={user.createdAt + user.email}
        >
          <div className="flex flex-1 flex-row items-center gap-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={user.avatar}
                alt={user.fullName}
                className="w-full h-full object-cover h-10 w-10 rounded-full"
              />
              <AvatarFallback className="rounded-full text-primary font-bold bg-accent">
                {user.fullName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">{user.fullName}</p>
              <p className="text-xs text-gray-500 text-primary-foreground">{user.email}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-primary-foreground">
            {moment(user.createdAt).format("MMM DD, YYYY")}
          </p>
        </div>
      ))}
    </div>
  );
}
