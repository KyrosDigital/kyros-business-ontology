import { inngest } from "../../inngest-client";

export type AIAgentProgressEvent = {
  data: {
    type: 'progress' | 'complete' | 'error';
    content: string;
    operationResult?: any;
    timestamp: number;
  };
};

export const notifyUI = inngest.createFunction(
  { id: "notify-ui" },
  { event: "ai-agent/progress" },
  async ({ event, step }) => {
    // This function doesn't need to do anything - it's just for event handling
    return { success: true };
  }
); 