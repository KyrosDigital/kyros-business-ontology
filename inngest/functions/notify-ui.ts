import { inngest } from "../inngest-client";
import Ably from "ably";

// Initialize Ably REST client
const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export const notifyUI = inngest.createFunction(
  { id: "notify-ui" },
  { event: "ui/notify" },
  async ({ event, step }) => {
    const { userId, type, message, data } = event.data;

    if (!userId) {
      throw new Error("User ID is required for UI notifications");
    }

    // Determine channel based on notification type
    let channelName;
    if (type === "graph-update") {
      channelName = `graph-updates:${userId}`;
    } else if (type === "ai-chat") {
      channelName = `ai-chat:${userId}`;
    } else {
      throw new Error(`Invalid notification type: ${type}`);
    }

    // Publish to Ably channel using REST client
    await step.run("publish-to-ably", async () => {
      const channel = ably.channels.get(channelName);
      await channel.publish("message", {
        userId,
        type,
        message,
        timestamp: new Date().toISOString(),
        data
      });
    });

    return { success: true };
  }
);

// Define the event type for better type safety
export type NotifyUIEvent = {
  name: "ui/notify";
  data: {
    userId: string;
    type: "graph-update" | "ai-chat";
    message: string;
    data?: any;
  };
};
