import { getAiClient, getModel } from "./llm";

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
    const client = getAiClient();
    const systemPrompt = `${params.system}\n\nIMPORTANT: Return valid JSON ONLY. Do not include markdown formatting or backticks.\n${params.schemaDescription ? `\nJSON Schema:\n${params.schemaDescription}` : ""}`;
    
    const response = await client.chat.completions.create({
      model: getModel(),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.prompt },
      ],
    });
    
    const text = response.choices[0]?.message?.content || "{}";
    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    
    try {
      return JSON.parse(cleaned) as T;
    } catch (e) {
      console.error("Failed to parse AI JSON response:", cleaned);
      throw e;
    }
  }

  async generateText(params: { system: string; prompt: string }): Promise<string> {
    const client = getAiClient();
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.prompt },
      ],
    });
    return response.choices[0]?.message?.content || "";
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
