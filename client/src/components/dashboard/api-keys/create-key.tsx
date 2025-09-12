import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiKeySchema, type CreateApiKeyFormData } from "@/lib/zod-schemas/api-keys";
import { useCreateApiKey } from "@/hooks/useApiKeys";
import { ErrorCard } from "@/components/common/status-message";
import { Loader2Icon } from "lucide-react";

export function CreateKey() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate: createApiKey, isPending, error } = useCreateApiKey();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyFormData>({
    resolver: zodResolver(createApiKeySchema),
  });

  const onSubmit = (data: CreateApiKeyFormData) => {
    createApiKey(data, {
      onSuccess: () => {
        setIsModalOpen(false);
        reset();
      },
    });
  };

  return (
    <div className="w-full sm:w-auto">
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Card className="w-full max-w-sm shadow-lg border-none bg-foreground">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Create API Key</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <ErrorCard error={error} classNames="mb-4" />}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">API Key Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="ex: Partner API Access"
                  {...register("name")}
                  required
                  className="border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-colored-primary text-white colored-button"
              >
                {isPending ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isPending ? "Generating..." : "Generate"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Modal>
      <Button
        className="w-full colored-button bg-colored-primary text-white font-semibold"
        onClick={() => setIsModalOpen(true)}
      >
        + Create New Key
      </Button>
    </div>
  );
}
