import { getModel } from "./llm";
import { generateText } from "ai";

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
    } catch (e) {
      console.error("Failed to parse AI JSON response:", cleaned);
      throw e;
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
  if (process.env.AI_PROVIDER === "mock") return new MockCareerProvider();
  return new NvidiaNimProvider();
}
