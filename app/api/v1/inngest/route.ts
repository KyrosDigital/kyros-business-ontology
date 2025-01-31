import { serve } from "inngest/next";
import { inngest } from "@/inngest/inngest-client";
import { aiAgentInit } from "@/inngest/functions/ai-agent/init";
import { generateEmbedding } from "@/inngest/functions/ai-agent/generateEmbedding";
import { queryPinecone } from "@/inngest/functions/ai-agent/queryPinecone";
import { generateActionPlan } from "@/inngest/functions/ai-agent/generateActionPlan";
import { validatePlan } from "@/inngest/functions/ai-agent/validatePlan";
import { executePlan } from "@/inngest/functions/ai-agent/executePlan";
import { createNodeTool } from "@/inngest/functions/ai-agent/tools/create_node";
import { createRelationshipTool } from "@/inngest/functions/ai-agent/tools/create_relationship";
import { vectorSearch } from "@/inngest/functions/ai-agent/tools/vector_search";
import { notifyUI } from "@/inngest/functions/notify-ui";
import { provideInsights } from "@/inngest/functions/ai-agent/tools/provide_insights";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    aiAgentInit,
    generateEmbedding,
		queryPinecone,
		generateActionPlan,
		validatePlan,
		executePlan,
		createNodeTool,
		createRelationshipTool,
		vectorSearch,
		notifyUI,
		provideInsights
  ],
});