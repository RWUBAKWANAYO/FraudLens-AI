import { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client";

interface Alert {
  id: string;
  title: string;
  summary: string;
  severity: string;
  createdAt: string;
}

export default function RealTimeAlerts({ companyId }: { companyId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
    console.log("Connecting to socket server:", socketUrl);

    const newSocket = io(socketUrl || "", {
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server with ID:", newSocket.id);
      setConnectionStatus("connected");
      newSocket.emit("join_company", companyId);
      console.log("Joined company:", companyId);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnectionStatus("disconnected");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnectionStatus("error");
    });

    newSocket.on("alert", (alert: Alert) => {
      console.log("Received alert:", alert);
      setAlerts((prev) => [alert, ...prev.slice(0, 9)]);
    });

    // Load initial alerts
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/alerts?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Loaded initial alerts:", data.length);
        setAlerts(data.slice(0, 10));
      })
      .catch((err) => console.error("Failed to load alerts:", err));

    return () => {
      console.log("Cleaning up socket connection");
      newSocket.close();
    };
  }, [companyId]);

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Real-time Alerts</h2>
        <span
          className={`text-sm ${
            connectionStatus === "connected"
              ? "text-green-500"
              : connectionStatus === "error"
              ? "text-red-500"
              : "text-yellow-500"
          }`}
        >
          {connectionStatus.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded border-l-4 ${
              alert.severity === "critical"
                ? "border-red-500 bg-red-400"
                : alert.severity === "high"
                ? "border-orange-500 bg-orange-400"
                : "border-yellow-500 bg-yellow-400"
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{alert.title}</h3>
              <span className="text-xs text-gray-500">
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm mt-1">{alert.summary}</p>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No alerts yet. Connection: {connectionStatus}
          </p>
        )}
      </div>
    </div>
  );
}
