import { serve } from "inngest/next";
import { inngest } from "@/inngest/inngest-client";
import { aiAgentInit } from "@/inngest/functions/ai-agent/init";
import { generateEmbedding } from "@/inngest/functions/ai-agent/generateEmbedding";
import { queryPinecone } from "@/inngest/functions/ai-agent/queryPinecone";
import { generateActionPlan } from "@/inngest/functions/ai-agent/generateActionPlan";
import { validatePlan } from "@/inngest/functions/ai-agent/validatePlan";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    aiAgentInit,
    generateEmbedding,
		queryPinecone,
		generateActionPlan,
		validatePlan,
  ],
});

/**
{
  "data": {
    "prompt": "Does the role CAIO exist? If not, create it and then relate Nathan to it so that Nathan Fills CAIO role",
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