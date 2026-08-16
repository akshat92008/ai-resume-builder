import { getModel } from "./llm";
import { generateText } from "ai";
import { logger } from "@/lib/observability/logger";

export interface AIProvider {
  generateJSON<T>(params: {
    system: string;
    prompt: string;
    schemaDescription?: string;
  }): Promise<T>;

  generateText(params: {
    system: string;
    prompt: string;
  }): Promise<string>;
}

export class NvidiaNimProvider implements AIProvider {
  async generateJSON<T>(params: {
    system: string;
    prompt: string;
    schemaDescription?: string;
  }): Promise<T> {
    const systemPrompt = `${params.system}\n\nIMPORTANT: Return valid JSON ONLY. Do not include markdown formatting or backticks.\n${params.schemaDescription ? `\nJSON Schema:\n${params.schemaDescription}` : ""}`;

    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt,
      prompt: params.prompt,
    });

    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch (error) {
      // Resume and career data can contain sensitive personal information. Never log
      // the model response body when structured-output parsing fails.
      logger.error("[ai-provider] Invalid structured model response", {
        error,
        responseLength: cleaned.length,
      });
      throw new Error("AI provider returned invalid structured output.", { cause: error });
    }
  }

  async generateText(params: { system: string; prompt: string }): Promise<string> {
    const { text } = await generateText({
      model: getModel(),
      system: params.system,
      prompt: params.prompt,
    });
    return text;
  }
}

export class MockCareerProvider implements AIProvider {
  async generateJSON<T>(): Promise<T> {
    return {} as T;
  }

  async generateText(): Promise<string> {
    return "";
  }
}

export function getCareerAIProvider(): AIProvider {
  if (process.env.AI_PROVIDER === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("The mock AI provider is disabled in production.");
    }
    return new MockCareerProvider();
  }
  return new NvidiaNimProvider();
}
