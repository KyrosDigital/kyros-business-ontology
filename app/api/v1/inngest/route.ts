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
		createRelationshipTool
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


{
  "data": {
    "fromNodeId": "7dd40dd8-cc96-4fc1-9c0f-48debea81041",
    "toNodeId": "5f8de66c-ee58-4a24-a5ff-36c17970a2b2",
    "relationType": "Owns",
    "organizationId": "d5751c89-b569-4f9e-abc2-7ad7d7cd89f3",
    "ontologyId": "56e6fb99-7545-4931-9ddf-b8cb87604ef8"
  }
}
*/