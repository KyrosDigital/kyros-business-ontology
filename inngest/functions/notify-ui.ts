import { inngest } from "../inngest-client";

export const notifyUI = inngest.createFunction(
  { id: "notify-ui" },
  { event: "ui/notify" },
  async ({ event, step }) => {
    const message = {
      type: event.data.type,
      content: event.data.content,
      timestamp: new Date().toISOString()
    };

    // Send POST request to notify-ui endpoint
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/notify-ui`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return { success: true, message };
  }
);

// Define the event type for better type safety
export type NotifyUIEvent = {
  name: "ui/notify";
  data: {
    type: string;
    content: string;
  };
};
