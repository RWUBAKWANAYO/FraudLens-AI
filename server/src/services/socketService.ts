import { Server } from "socket.io";
import { getRedisPubSub, checkRedisHealth } from "../config/redis";

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private isSubscribed = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  initialize(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
    this.setupRedisSubscriptions();
    this.startHealthChecks();
  }

  private startHealthChecks() {
    // Check Redis connection every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await checkRedisHealth();
        if (!isHealthy) {
          console.warn("Redis connection unhealthy, reconnecting...");
          await this.reconnectRedis();
        }
      } catch (error) {
        console.error("Health check failed:", error);
      }
    }, 30000);
  }

  private stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("join_company", (companyId: string) => {
        socket.join(`company:${companyId}`);
        console.log(`Socket ${socket.id} joined company:${companyId}`);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });

      socket.on("ping", (cb) => {
        cb("pong");
      });
    });
  }

  private async setupRedisSubscriptions() {
    if (this.isSubscribed) return;

    try {
      const { subClient } = await getRedisPubSub();

      // Remove any existing listeners to avoid duplicates
      subClient.removeAllListeners("message");

      // Subscribe to channels
      await subClient.subscribe("alerts", this.handleAlertMessage.bind(this));
      await subClient.subscribe("upload_status", this.handleStatusMessage.bind(this));
      await subClient.subscribe("threat_updates", this.handleThreatMessage.bind(this));

      this.isSubscribed = true;
      console.log("Redis subscriptions established");
    } catch (error) {
      console.error("Failed to setup Redis subscriptions:", error);
      // Retry after delay with exponential backoff
      setTimeout(() => this.setupRedisSubscriptions(), 5000);
    }
  }

  public async reconnectRedis() {
    console.log("Reconnecting Redis subscriptions...");
    this.isSubscribed = false;
    await this.setupRedisSubscriptions();
  }

  private handleAlertMessage(message: string) {
    try {
      const parsed = JSON.parse(message);
      const { companyId, event, _metadata } = parsed;

      if (!companyId || !event) {
        console.error("Invalid alert message format:", parsed);
        return;
      }

      this.emitToCompany("alert", companyId, {
        ...event,
        timestamp: _metadata?.publishedAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error processing alert message:", error, message);
    }
  }

  private handleThreatMessage(message: string) {
    try {
      const parsed = JSON.parse(message);
      const { companyId, event, _metadata } = parsed;

      if (!companyId || !event) {
        console.error("Invalid threat message format:", parsed);
        return;
      }

      this.emitToCompany("threat_update", companyId, {
        ...event,
        timestamp: _metadata?.publishedAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error processing threat message:", error, message);
    }
  }

  private emitToCompany(event: string, companyId: string, data: any) {
    if (!this.io) {
      console.error("Socket.IO not initialized");
      return;
    }

    this.io.to(`company:${companyId}`).emit(event, data);
    console.log(`Emitted ${event} to company ${companyId}`);
  }

  // Add this method to handle status messages
  private handleStatusMessage(message: string) {
    try {
      console.log("Raw status message:", message);

      const parsed = JSON.parse(message);

      console.log("Parsed status message:", parsed);

      // Extract companyId and event from the correct structure
      const { companyId, event, _metadata } = parsed;

      if (!companyId || !event) {
        console.error("Invalid message format:", parsed);
        return;
      }

      // Handle different status types
      switch (event.type) {
        case "upload_progress":
          this.emitToCompany("upload_progress", companyId, {
            ...event,
            timestamp: _metadata?.publishedAt || new Date().toISOString(),
          });
          break;
        case "upload_complete":
          this.emitToCompany("upload_complete", companyId, {
            ...event,
            timestamp: _metadata?.publishedAt || new Date().toISOString(),
          });
          break;
        case "upload_error":
          this.emitToCompany("upload_error", companyId, {
            ...event,
            timestamp: _metadata?.publishedAt || new Date().toISOString(),
          });
          break;
        default:
          this.emitToCompany("upload_status", companyId, {
            ...event,
            timestamp: _metadata?.publishedAt || new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error("Error processing status message:", error, message);
    }
  }

  // Public method for main server to emit events
  emitAlert(companyId: string, event: any) {
    this.emitToCompany("alert", companyId, event);
  }

  emitStatus(companyId: string, event: any) {
    this.emitToCompany("upload_status", companyId, event);
  }

  public shutdown() {
    this.stopHealthChecks();
    this.io = null;
    this.isSubscribed = false;
  }
}

// Singleton export
export const socketService = SocketService.getInstance();
