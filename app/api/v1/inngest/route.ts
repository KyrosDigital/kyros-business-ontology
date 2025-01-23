import { serve } from "inngest/next";
import { inngest } from "@/inngest/inngest-client";
import { aiAgentInit } from "@/inngest/functions/ai-agent/init";
import { generateEmbedding } from "@/inngest/functions/ai-agent/generateEmbedding";
import { queryPinecone } from "@/inngest/functions/ai-agent/queryPinecone";
import { generateActionPlan } from "@/inngest/functions/ai-agent/generateActionPlan";
import { validatePlan } from "@/inngest/functions/ai-agent/validatePlan";
import { executePlan } from "@/inngest/functions/ai-agent/executePlan";
import { createNodeTool } from "@/inngest/functions/ai-agent/tools/create_node";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    aiAgentInit,
    generateEmbedding,
		queryPinecone,
		generateActionPlan,
		validatePlan,
		executePlan,
		createNodeTool
  ],
});

/**
{
  "data": {
    "prompt": "Create an organization named NextDev, then create a person named Nathan, then create a role named CTO. Nathan owns NextDev and Assumes role of CTO",
    "organization": {
      "id": "d5751c89-b569-4f9e-abc2-7ad7d7cd89f3",
      "pineconeIndex": "kyrosagency-index-1734053480036"
    },
    "ontology": {
      "id": "56e6fb99-7545-4931-9ddf-b8cb87604ef8"
    }
  }
}
*/