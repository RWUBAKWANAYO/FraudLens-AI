"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@mui/material";
import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

export interface IThreat {
  id: string;
  title: string;
  description: string;
}

export function ThreatExplanation({ threat }: { threat: IThreat }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="">
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        keepMounted
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="p-4 space-y-4 border border-accent-foreground  rounded-lg bg-foreground shadow-sm w-full sm:w-[600px]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-primary">{threat.title}</h2>
            <p className="text-sm font-medium text-primary-foreground">06 June 2023</p>
          </div>
          <p className="text-sm text-primary-foreground">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Iusto ad est necessitatibus
            aperiam sit eos placeat laborum sapiente quod mollitia itaque, fuga maxime totam sequi
            quas magni ullam aspernatur ex? Lorem ipsum dolor sit amet consectetur adipisicing elit.
            Iusto ad est necessitatibus aperiam sit eos placeat laborum sapiente quod mollitia
            itaque, fuga maxime totam sequi quas magni ullam aspernatur ex? Lorem ipsum dolor sit
            amet consectetur adipisicing elit. Iusto ad est necessitatibus aperiam sit eos placeat
            laborum sapiente quod mollitia itaque, fuga maxime totam sequi quas magni ullam
            aspernatur ex?
          </p>
          <div className="w-full flex flex-col gap-4">
            <h2>Was this helpful? </h2>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => {}}
                size={"sm"}
                className="bg-colored-primary colored-button rounded-sm text-white"
              >
                <ThumbsUp />
                Yes
              </Button>
              <Button
                type="button"
                onClick={() => {}}
                size={"sm"}
                className="bg-colored-primary colored-button rounded-sm text-white"
              >
                <ThumbsDown />
                No
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      <Button
        type="button"
        onClick={() => handleSubmit()}
        className="border border-colored-primary colored-button rounded-sm shadow-none text-colored-primary bg-transparent"
      >
        Explain with AI
      </Button>
    </div>
  );
}
