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

export function CreateKey() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const deleteHandler = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating key");
    setIsModalOpen(false);
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
            <CardTitle className="text-2xl font-bold text-primary">Create api key</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={deleteHandler} className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Api key Name</Label>
                <Input id="name" type="text" placeholder="ex: Partner API Access" required />
              </div>
              <Button type="submit" className="w-full bg-colored-primary text-white colored-button">
                Generate
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
