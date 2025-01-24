import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";
import { generateActionPlanSystemPrompt } from "@/prompts/openai";

export const generateActionPlan = inngest.createFunction(
  { id: "generate-action-plan" },
  { event: "ai-agent/generate-plan" },
  async ({ event, step }: { event: any; step: any }) => {
    const { prompt, pineconeResults: contextData, organization, ontology, customNodeTypeNames } = event.data;

    const systemPrompt: string = generateActionPlanSystemPrompt(customNodeTypeNames)

    const response = await openAIService.generateChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `User Prompt: ${prompt}\n\nContext Data: ${JSON.stringify(contextData, null, 2)}` },
    ], { temperature: 0.7, model: "gpt-4o-2024-08-06" });

    const planningResponse = response.content;

		await step.sendEvent("start-validate-plan", {
			name: "ai-agent/validate-plan",
			data: {
				planningResponse,
				contextData,
				prompt,
				organization,
				ontology,
				customNodeTypeNames
			},
		});

    return { success: true, planningResponse };
  }
);
