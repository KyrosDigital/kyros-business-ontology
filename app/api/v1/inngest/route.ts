import { serve } from "inngest/next";
import { inngest } from "@/inngest/inngest-client";
import { aiAgentStart } from "@/inngest/functions/ai-agent/start";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    aiAgentStart, // Added the new AI agent function
  ],
});

/**
{
  "data": {
    "prompt": "What roles exist within the organization?",
    "organization": {
      "id": "d5751c89-b569-4f9e-abc2-7ad7d7cd89f3",
      "pineconeIndex": "kyrosagency-index-1734053480036"
    },
    "ontology": {
      "id": "c70cea94-d0e5-4328-a7cd-655a5900b29a"
    }
  }
}
*/