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
import {
  useApiKeys,
  useRevokeApiKey,
  useReactivateApiKey,
  useRotateApiKeySecret,
} from "@/hooks/useApiKeys";

export default function ApiKeysList() {
  const { data: apiKeys, isLoading, error } = useApiKeys();
  const revokeMutation = useRevokeApiKey();
  const reactivateMutation = useReactivateApiKey();
  const rotateMutation = useRotateApiKeySecret();

  const toggleApiKeyStatus = async (apiKeyId: string, currentStatus: boolean) => {
    if (currentStatus) {
      revokeMutation.mutate(apiKeyId);
    } else {
      reactivateMutation.mutate(apiKeyId);
    }
  };

  const rotateSecret = async (apiKeyId: string) => {
    rotateMutation.mutate(apiKeyId);
  };

  if (isLoading) {
    return (
      <div
        className="bg-foreground rounded-lg p-6 flex items-center justify-center"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        <Loader2Icon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-foreground rounded-lg p-6" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="text-red-500">Error loading API keys: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="bg-foreground rounded-lg p-6" style={{ minHeight: "calc(100vh - 120px)" }}>
      <div className="w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for accessing our services
          </p>
        </div>
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
            {apiKeys?.map((item) => {
              const isRevoking = revokeMutation.isPending && revokeMutation.variables === item.id;
              const isReactivating =
                reactivateMutation.isPending && reactivateMutation.variables === item.id;
              const isRotating = rotateMutation.isPending && rotateMutation.variables === item.id;

              return (
                <TableRow key={item.id} className="border-b border-accent hover:bg-tableHover">
                  <TableCell className="py-4">{item.name}</TableCell>
                  <TableCell className="py-4">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-4">
                    <CopyableCell value={item.key} />
                  </TableCell>

                  <TableCell className="py-4">
                    <CopyableCell value={item.secret} maskable defaultVisible={false} />
                  </TableCell>

                  <TableCell className="py-4">
                    <div
                      className={`font-medium text-center py-[2px] px-2 w-fit rounded-full capitalize ${
                        item.enabled
                          ? "bg-badge-greenBg text-emerald-500 border border-badge-greenBorder"
                          : "bg-badge-redBg text-red-500 border border-badge-redBorder"
                      }`}
                    >
                      {item.enabled ? "active" : "revoked"}
                    </div>
                  </TableCell>

                  <TableCell className="py-4 text-right">
                    <div className="flex gap-4 justify-end">
                      <Button
                        size="sm"
                        className="flex items-center colored-button gap-1 bg-foreground text-primary shadow-sm border border-accent w-[100px]"
                        onClick={() => toggleApiKeyStatus(item.id, item.enabled)}
                        disabled={isRevoking || isReactivating || isRotating}
                      >
                        {isRevoking || isReactivating ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                        {item.enabled ? "Revoke" : "Reactivate"}
                      </Button>
                      <Button
                        size="sm"
                        className="flex items-center colored-button gap-1 bg-foreground text-primary shadow-sm border border-accent w-[100px]"
                        onClick={() => rotateSecret(item.id)}
                        disabled={isRotating || isRevoking || isReactivating}
                      >
                        {isRotating ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Rotate
                      </Button>
                      <RemoveKey keyId={item.id} keyName={item.name} />
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
