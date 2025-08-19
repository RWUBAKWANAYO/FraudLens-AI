"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Transaction } from "../types";

import TransactionForm from "../components/TransactionForm";
import DashboardMetrics from "../components/DashboardMetrics";
import FraudList from "../components/FraudList";
import TransactionTable from "../components/TransactionTable";

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fraudTransactions, setFraudTransactions] = useState<Transaction[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:8080");
    setSocket(newSocket);

    newSocket.on("fraudDetected", (data: Transaction) => {
      setFraudTransactions((prev) => [
        ...prev,
        { ...data, isFraud: true, alert: "⚠️ Real-time fraud detected!" },
      ]);
      setTransactions((prev) => [...prev, data]);

      if (Notification.permission === "granted") {
        new Notification("Fraud Alert!", {
          body: `Fraud detected for amount: $${data.amount}`,
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const checkFraud = async (amount: number) => {
    const res = await fetch("http://localhost:8080/api/fraud-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: "tx" + Math.random().toString(36).substring(2, 9),
        amount,
        userId: "931a9ffe-255f-461b-8dd0-63bc0fda04d1",
      }),
    });
    const data: Transaction = await res.json();
    setTransactions((prev) => [...prev, data]);
    if (data.isFraud) setFraudTransactions((prev) => [...prev, data]);
  };

  const requestNotificationPermission = () => {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") console.log("Notification permission granted");
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Blackbox AI - Fraud Detection</h1>

      <div className="w-full max-w-4xl space-y-6">
        <TransactionForm
          onSubmit={checkFraud}
          onRequestNotification={requestNotificationPermission}
        />

        <DashboardMetrics transactions={transactions} fraudTransactions={fraudTransactions} />

        <FraudList fraudTransactions={fraudTransactions} />

        <TransactionTable transactions={transactions} />
      </div>
    </main>
  );
}

