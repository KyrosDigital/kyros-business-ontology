import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";
import { PineconeService } from "../../../services/pinecone";
import { Organization, Ontology } from "@prisma/client";

type AIAgentStartEvent = {
  data: {
    prompt: string;
    organization: Organization;
    ontology: Ontology;
  };
};

export const aiAgentStart = inngest.createFunction(
  { id: "ai-agent-start" },
  { event: "ai-agent/start" },
  async ({ event, step }: { event: AIAgentStartEvent, step: any }) => {
    const { prompt, organization, ontology } = event.data;

    // 1. Generate embedding for the prompt
    const embedding = await step.run("generate-embedding", async () => {
      return await openAIService.generateEmbedding(prompt);
    });

    // 2. Query Pinecone for similar vectors
    const pineconeResults = await step.run("query-pinecone", async () => {
      const pineconeService = new PineconeService(organization, ontology);
      const results = await pineconeService.querySimilar(embedding, 5);
      return results;
    });

    // 3. Generate action plan using GPT-4
    const actionPlan = await step.run("generate-action-plan", async () => {
      const contextData = pineconeResults?.map(result => ({
        type: result.metadata.type,
        content: result.metadata.content,
        score: result.score,
      }));

      const systemPrompt = `You are an AI agent specialized in working with Ontology-based knowledge systems. Your task is to analyze requests and plan actions within this system.

SYSTEM ARCHITECTURE:
- Ontologies: Core knowledge structures
- Nodes: Individual entities within ontologies
- Relationships: Connections between nodes
- Notes: Additional context attached to nodes

USER INTENTS:
1. Query Intent: User wants insights from existing ontology data
2. Modification Intent: User wants to update ontology structure

AVAILABLE OPERATIONS:
1. Query Operations:
   - Search nodes by type/properties
   - Analyze relationships
   - Traverse relationship paths
   - Retrieve node metadata

2. Modification Operations:
   - Create/Update nodes
   - Establish relationships
   - Add notes to nodes
   - Modify node properties

Respond with concise JSON:
{
  "intent": "QUERY | MODIFICATION",
  "analysis": "Brief interpretation of user's need",
  "relevantContext": ["Only context items that directly relate to request"],
  "proposedActions": ["Ordered list of specific operations needed"],
  "requiredTools": ["Only tools needed for these actions"]
}

Focus solely on information present in the user's prompt and provided context. Do not make assumptions about data not shown.`;

      const response = await openAIService.generateChatCompletion([
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `User Prompt: ${prompt}\n\nContext Data: ${JSON.stringify(contextData, null, 2)}`
        }
      ], {
        temperature: 0.7,
        model: "gpt-4-0125-preview",  // Using GPT-4 Turbo
      });

      return {
        prompt,
        contextData,
        planningResponse: response.content,
      };
    });

    // 4. Log everything for debugging
    await step.run("log-results", async () => {
      return {
        prompt,
        similarResults: pineconeResults?.map(result => ({
          score: result.score,
          metadata: result.metadata,
        })),
        actionPlan,
      };
    });

    return { success: true };
  },
);
