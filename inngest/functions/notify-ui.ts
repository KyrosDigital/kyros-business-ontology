import { inngest } from "../inngest-client";
import Ably from "ably";

// Initialize Ably REST client
const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

// Define channel types
type ChannelType = "graph-update" | "ai-chat";

// Define message types for each channel
type MessageType = {
  "graph-update": "node" | "relationship" | "delete";
  "ai-chat": "progress" | "message" | "error";
};

export const notifyUI = inngest.createFunction(
  { id: "notify-ui" },
  { event: "ui/notify" },
  async ({ event, step }) => {
    const { 
      userId, 
      channelType, 
      type, 
      message, 
      data 
    } = event.data;

    if (!userId) {
      throw new Error("User ID is required for UI notifications");
    }

    if (!channelType || !type) {
      throw new Error("Channel type and message type are required");
    }

    // Validate channel type
    if (!["graph-update", "ai-chat"].includes(channelType)) {
      throw new Error(`Invalid channel type: ${channelType}`);
    }

    // Validate message type based on channel
    const validTypes = {
      "graph-update": ["node", "relationship", "delete"],
      "ai-chat": ["progress", "message", "error"]
    };

    if (!validTypes[channelType].includes(type)) {
      throw new Error(`Invalid message type "${type}" for channel "${channelType}"`);
    }

    // Get channel name based on user and channel type
    const channelName = `${channelType}:${userId}`;

    // Publish to Ably channel using REST client
    await step.run("publish-to-ably", async () => {
      const channel = ably.channels.get(channelName);
      await channel.publish("message", {
        userId,
        channelType,
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
    channelType: ChannelType;
    type: MessageType[ChannelType];
    message: string;
    data?: any;
  };
};
