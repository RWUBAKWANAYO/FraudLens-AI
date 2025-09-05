"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw, Power, Loader2Icon } from "lucide-react";
import { RemoveKey } from "@/components/dashboard/api-keys/remove-key";
import { CopyableCell } from "@/components/dashboard/api-keys/copyable-cell";
import { CreateKey } from "@/components/dashboard/api-keys/create-key";

type ApiKey = {
  id: string;
  name: string;
  createdAt: string;
  apiKey: string;
  apiSecret: string;
  status: "active" | "revoked";
};

const apiKeysData: ApiKey[] = [
  {
    id: "KEY-1001",
    name: "Fraud Detection Service",
    createdAt: "2025-08-20 10:22",
    apiKey: "pk_live_1234567890abcdef",
    apiSecret: "sk_live_secret_abcdef1234567890",
    status: "active",
  },
  {
    id: "KEY-1002",
    name: "Mobile App Integration",
    createdAt: "2025-08-25 15:05",
    apiKey: "pk_live_9876543210fedcba",
    apiSecret: "sk_live_secret_fedcba9876543210",
    status: "revoked",
  },
  {
    id: "KEY-1003",
    name: "Partner API Access",
    createdAt: "2025-09-01 08:45",
    apiKey: "pk_live_abcd1234efgh5678",
    apiSecret: "sk_live_secret_1234abcd5678efgh",
    status: "active",
  },
];

export default function ApiKeysList() {
  return (
    <div className=" bg-foreground rounded-lg p-6" style={{ minHeight: "calc(100vh - 140px)" }}>
      <div className="w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <h2 className="text-lg font-bold">API Keys</h2>
        <CreateKey />
      </div>

      <div className="w-full overflow-hidden rounded-md border border-accent">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-tableHover">
            <TableRow className="border-accent text-primary">
              <TableHead className="py-4 text-primary font-bold">Name</TableHead>
              <TableHead className="py-4 text-primary font-bold">Created At</TableHead>
              <TableHead className="py-4 text-primary font-bold">API Key</TableHead>
              <TableHead className="py-4 text-primary font-bold">API Secret</TableHead>
              <TableHead className="py-4 text-primary font-bold">Status</TableHead>
              <TableHead className="py-4 text-primary font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {apiKeysData.map((item) => {
              return (
                <TableRow key={item.id} className="border-b border-accent hover:bg-tableHover">
                  <TableCell className="py-4">{item.name}</TableCell>
                  <TableCell className="py-4">{item.createdAt}</TableCell>
                  <TableCell className="py-4">
                    <CopyableCell id={`${item.id}:apiKey`} value={item.apiKey} />
                  </TableCell>

                  <TableCell className="py-4">
                    <CopyableCell
                      id={item.id}
                      value={item.apiSecret}
                      maskable
                      defaultVisible={false}
                    />
                  </TableCell>

                  <TableCell className={`py-4`}>
                    <div
                      className={`font-medium text-center py-[2px] px-2 w-fit rounded-full capitalize ${
                        item.status === "active"
                          ? "bg-badge-greenBg text-emerald-500 border border-badge-greenBorder"
                          : "bg-badge-redBg text-red-500 border border-badge-redBorder"
                      }`}
                    >
                      {item.status}
                    </div>
                  </TableCell>

                  <TableCell className="py-4 text-right">
                    <div className="flex gap-4 justify-end">
                      {item.status === "active" ? (
                        <Button
                          size="sm"
                          className="flex items-center colored-button gap-1 bg-foreground  text-primary shadow-sm border border-accent w-[100px]"
                        >
                          <Power className="h-4 w-4" /> Revoke
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex items-center colored-button gap-1 bg-foreground  text-primary shadow-sm border border-accent w-[100px]"
                        >
                          {false ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <span className="flex items-center gap-1">
                              <Power className="h-4 w-4" /> Reactivate
                            </span>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="flex items-center colored-button gap-1 bg-foreground  text-primary shadow-sm border border-accent w-[100px]"
                      >
                        <RotateCcw className="h-4 w-4" /> Rotate
                      </Button>
                      <RemoveKey keyId={item.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
