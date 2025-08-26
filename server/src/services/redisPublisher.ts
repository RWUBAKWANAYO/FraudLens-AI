// server/src/services/redisPublisher.ts
import { getRedisPubSub } from "../config/redis";

interface PublishOptions {
  retry?: number;
  timeout?: number;
}

export class RedisPublisher {
  private static instance: RedisPublisher;

  static getInstance(): RedisPublisher {
    if (!RedisPublisher.instance) {
      RedisPublisher.instance = new RedisPublisher();
    }
    return RedisPublisher.instance;
  }

  async publish(
    channel: string,
    message: any,
    options: PublishOptions = { retry: 3, timeout: 5000 }
  ): Promise<boolean> {
    const { retry = 3, timeout = 5000 } = options;

    for (let attempt = 1; attempt <= retry; attempt++) {
      try {
        const { pubClient } = await getRedisPubSub();

        const payload = JSON.stringify({
          ...message,
          _metadata: {
            publishedAt: new Date().toISOString(),
            attempt,
            channel,
          },
        });

        await Promise.race([
          pubClient.publish(channel, payload),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Publish timeout")), timeout)
          ),
        ]);

        console.log(`Published to ${channel} (attempt ${attempt})`);
        return true;
      } catch (error) {
        console.error(`Publish attempt ${attempt} failed:`, error);

        if (attempt === retry) {
          console.error(`All ${retry} publish attempts failed for channel ${channel}`);
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return false;
  }

  async publishAlert(companyId: string, event: any) {
    return this.publish("alerts", { companyId, event });
  }

  async publishStatus(companyId: string, event: any) {
    return this.publish("upload_status", { companyId, event });
  }

  async publishThreat(companyId: string, event: any) {
    return this.publish("threat_updates", { companyId, event });
  }

  // NEW: Enhanced status publishing with detailed progress
  async publishUploadProgress(
    companyId: string,
    uploadId: string,
    progress: number,
    stage: string,
    message: string,
    details?: any
  ) {
    return this.publishStatus(companyId, {
      type: "upload_progress",
      uploadId,
      progress,
      stage,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUploadComplete(
    companyId: string,
    uploadId: string,
    result: any,
    threats: any[],
    summary: any
  ) {
    return this.publishStatus(companyId, {
      type: "upload_complete",
      uploadId,
      result,
      threats,
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUploadError(companyId: string, uploadId: string, error: string) {
    return this.publishStatus(companyId, {
      type: "upload_error",
      uploadId,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}

export const redisPublisher = RedisPublisher.getInstance();
