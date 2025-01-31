import { inngest } from "../../../inngest-client";
import { Organization, Ontology } from "@prisma/client";

interface ProvideInsightsEvent {
  data: {
    insights: string;
    analysisType: "relationships" | "patterns" | "gaps" | "recommendations";
    organization: Organization;
    ontology: Ontology;
    userId: string;
  };
}

export const provideInsights = inngest.createFunction(
  { id: "provide-insights" },
  { event: "ai-agent/tools/provide-insights" },
  async ({ event, step }: { event: ProvideInsightsEvent; step: any }) => {
    const { insights, userId } = event.data;

    try {
      // Send the pre-generated insights as a message
      await step.sendEvent("notify-insights", {
        name: "ui/notify",
        data: {
          userId,
          channelType: "ai-chat",
          type: "message",
          message: insights
        }
      });

      return {
        success: true
      };

    } catch (error) {
      console.error("Error providing insights:", error);
      
      // Send error notification
      await step.sendEvent("notify-insights-error", {
        name: "ui/notify",
        data: {
          userId,
          channelType: "ai-chat",
          type: "error",
          message: `Failed to provide insights: ${error instanceof Error ? error.message : "Unknown error"}`,
          data: null
        }
      });

      throw error;
    }
  }
);
