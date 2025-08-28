import { Server } from "socket.io";
import { getRedisPubSub, checkRedisHealth } from "../config/redis";

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private isSubscribed = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000;
  private readonly RECONNECT_DELAY = 5000;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  initialize(io: Server): void {
    this.io = io;
    this.setupSocketHandlers();
    this.setupRedisSubscriptions();
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await checkRedisHealth();
        if (!isHealthy) {
          await this.reconnectRedis();
        }
      } catch (error) {
        // Silent fail for health checks in production
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket) => {
      socket.on("join_company", (companyId: string) => {
        socket.join(`company:${companyId}`);
      });

      socket.on("ping", (cb) => {
        cb("pong");
      });
    });
  }

  private async setupRedisSubscriptions(): Promise<void> {
    if (this.isSubscribed) return;

    try {
      const { subClient } = await getRedisPubSub();

      subClient.removeAllListeners("message");

      await subClient.subscribe("alerts", this.handleAlertMessage.bind(this));
      await subClient.subscribe("upload_status", this.handleStatusMessage.bind(this));
      await subClient.subscribe("threat_updates", this.handleThreatMessage.bind(this));

      this.isSubscribed = true;
    } catch (error) {
      setTimeout(() => this.setupRedisSubscriptions(), this.RECONNECT_DELAY);
    }
  }

  public async reconnectRedis(): Promise<void> {
    this.isSubscribed = false;
    await this.setupRedisSubscriptions();
  }

  private handleAlertMessage(message: string): void {
    try {
      const parsed = JSON.parse(message);
      const { companyId, event, _metadata } = parsed;

      if (!companyId || !event) {
        return;
      }

      this.emitToCompany("alert", companyId, {
        ...event,
        timestamp: _metadata?.publishedAt || new Date().toISOString(),
      });
    } catch (error) {
      // Malformed messages are silently ignored in production
    }
  }

  private handleThreatMessage(message: string): void {
    try {
      const parsed = JSON.parse(message);
      const { companyId, event, _metadata } = parsed;

      if (!companyId || !event) {
        return;
      }

      this.emitToCompany("threat_update", companyId, {
        ...event,
        timestamp: _metadata?.publishedAt || new Date().toISOString(),
      });
    } catch (error) {
      // Malformed messages are silently ignored in production
    }
  }

  private emitToCompany(event: string, companyId: string, data: any): void {
    if (!this.io) {
      return;
    }

    this.io.to(`company:${companyId}`).emit(event, data);
  }

  private handleStatusMessage(message: string): void {
    try {
      const parsed = JSON.parse(message);
      const { companyId, event, _metadata } = parsed;

      if (!companyId || !event) {
        return;
      }

      const eventData = {
        ...event,
        timestamp: _metadata?.publishedAt || new Date().toISOString(),
      };

      switch (event.type) {
        case "upload_progress":
          this.emitToCompany("upload_progress", companyId, eventData);
          break;
        case "upload_complete":
          this.emitToCompany("upload_complete", companyId, eventData);
          break;
        case "upload_error":
          this.emitToCompany("upload_error", companyId, eventData);
          break;
        default:
          this.emitToCompany("upload_status", companyId, eventData);
      }
    } catch (error) {}
  }

  emitAlert(companyId: string, event: any): void {
    this.emitToCompany("alert", companyId, event);
  }

  emitStatus(companyId: string, event: any): void {
    this.emitToCompany("upload_status", companyId, event);
  }

  public shutdown(): void {
    this.stopHealthChecks();
    this.io = null;
    this.isSubscribed = false;
  }
}

export const socketService = SocketService.getInstance();
