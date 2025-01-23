import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";

export const generateActionPlan = inngest.createFunction(
  { id: "generate-action-plan" },
  { event: "ai-agent/generate-plan" },
  async ({ event, step }: { event: any; step: any }) => {
    const { prompt, pineconeResults, organization, ontology } = event.data;

    const contextData = pineconeResults.map(result => ({
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

AVAILABLE TOOLS:
1. search_vector_db
   - Purpose: Query the vector database for relevant nodes, relationships, and context
   - Use when: Need to find existing information or similar content

2. create_node
   - Purpose: Add new nodes to the ontology
   - Use when: New entity or concept needs to be added

3. update_node
   - Purpose: Modify existing node properties or metadata
   - Use when: Existing node information needs to be changed

4. create_relationship
   - Purpose: Establish new connections between existing nodes
   - Use when: Need to connect two nodes that should be related

5. update_relationship
   - Purpose: Modify existing relationship properties
   - Use when: Connection between nodes needs to be modified

6. delete_node_with_strategy
   - Purpose: Remove nodes with specific handling of relationships
   - Use when: Node needs to be removed while managing dependencies

Respond with concise JSON:
{
  "intent": "QUERY | MODIFICATION",
  "analysis": "Brief interpretation of user's need",
  "relevantContext": ["Only context items that directly relate to request"],
  "proposedActions": ["Ordered list of specific operations needed"],
  "requiredTools": ["Only tools from the AVAILABLE TOOLS list"]
}

Focus solely on information present in the user's prompt and provided context. Ensure all proposed actions map to specific available tools. Do not make assumptions about data not shown.`;

    const response = await openAIService.generateChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `User Prompt: ${prompt}\n\nContext Data: ${JSON.stringify(contextData, null, 2)}` },
    ], { temperature: 0.7, model: "gpt-4-0125-preview" });

    const planningResponse = response.content;

		await step.sendEvent("start-validate-plan", {
			name: "ai-agent/validate-plan",
			data: {
				planningResponse,
				contextData,
				prompt,
				organization,
				ontology,
			},
		});

    return { success: true, planningResponse };
  }
);
