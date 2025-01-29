import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";
import { generateActionPlanSystemPrompt, generateActionPlanUserPrompt } from "@/prompts/openai";
import { Organization, Ontology } from "@prisma/client";
import { PineconeResult } from "./queryPinecone";

interface GenerateActionPlanEvent {
  data: {
    prompt: string;
    contextData: PineconeResult[];
    organization: Organization;
    ontology: Ontology;
    customNodeTypeNames: string[];
  };
}

export const generateActionPlan = inngest.createFunction(
  { id: "generate-action-plan" },
  { event: "ai-agent/generate-plan" },
  async ({ event, step }: { event: GenerateActionPlanEvent; step: any }) => {
    const { prompt, contextData, customNodeTypeNames } = event.data;

    const planningResponse = await step.run("generate-action-plan", async () => {
      const systemPrompt: string = generateActionPlanSystemPrompt(customNodeTypeNames);

      const response = await openAIService.generateChatCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: generateActionPlanUserPrompt(prompt, contextData) },
      ], { temperature: 0.7, model: "gpt-4o-2024-08-06" });

      return response.content;
    });

    return { planningResponse };
  }
);
