import { NextRequest } from "next/server";
import { AIAgentProgressEvent } from "../../../../../inngest/functions/ai-agent/notify-ui";
import { inngest } from "../../../../../inngest/inngest-client";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendMessage(data: AIAgentProgressEvent['data']) {
        const chunk = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      }

      // Subscribe to Inngest events
      const unsubscribe = inngest.listen<AIAgentProgressEvent>("ai-agent/progress", (event) => {
        sendMessage(event.data);
      });

      // Clean up on disconnect
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
