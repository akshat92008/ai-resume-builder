import { EventPayload, Inngest } from "inngest";
import type { AgentIntent, CareerPathResume } from "@/lib/careerpath/types";

type Events = {
  "resume/process.intent": {
    data: {
      intent: AgentIntent;
      message: string;
      currentResume: CareerPathResume | null;
      userId: string;
      resumeId?: string;
      command?: unknown;
    };
  };
};

export const inngest = new Inngest({
  id: "careeros",
  schemas: { events: {} as Events },
  eventKey: process.env.INNGEST_EVENT_KEY || "local",
});
