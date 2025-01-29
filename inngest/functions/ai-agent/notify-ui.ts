import { inngest } from "../../inngest-client";

export type AIAgentProgressEvent = {
  data: {
    type: 'progress' | 'complete' | 'error';
    content: string;
    operationResult?: any;
    timestamp: number;
    sessionId: string;
  };
};

export const notifyUI = inngest.createFunction(
  { id: "notify-ui" },
  { event: "ai-agent/progress" },
  async ({ event, step }) => {
    const { sessionId, type, content, operationResult, timestamp } = event.data;

    // Make request to the SSE endpoint
    await step.run("send-sse-update", async () => {
      const response = await fetch(`http://localhost:3000/api/v1/chat/updates?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          content,
          operationResult,
          timestamp,
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send SSE update: ${response.statusText}`);
      }
    });

    return { success: true };
  }
); 