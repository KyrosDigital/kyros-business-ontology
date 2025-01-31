import { inngest } from "../../inngest-client";

export type AIAgentProgressEvent = {
  data: {
    userId: string;
    type: 'progress' | 'complete' | 'error';
    content: string;
    operationResult?: any;
    timestamp: number;
  };
};

export const notifyUI = inngest.createFunction(
  { id: "notify-ui" },
  { event: "ai-agent/progress" },
  async ({ event, step }) => {
    const { data } = event;
    console.log("Sending SSE update:", data);

    // Make request to the SSE endpoint with retries
    await step.run("send-sse-update", async () => {
      let attempts = 0;
      const maxAttempts = 5;
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`http://localhost:3000/api/v1/chat/updates?userId=${data.userId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error(`Failed to send SSE update: ${response.statusText}`);
          }

          const result = await response.json();
          console.log("SSE update response:", result);

          if (result.clientFound) {
            console.log("Successfully sent message to client");
            return; // Success, exit the retry loop
          }

          console.log(`Attempt ${attempts + 1}: Client not found, retrying in 1 second...`);
          attempts++;
          if (attempts < maxAttempts) {
            await delay(1000);
          }
        } catch (error) {
          console.error("Error sending SSE update:", error);
          attempts++;
          if (attempts < maxAttempts) {
            await delay(1000);
          }
        }
      }

      throw new Error(`Failed to send update after ${maxAttempts} attempts`);
    });

    return { success: true };
  }
); 