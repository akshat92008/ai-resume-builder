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
    const text = await this.generateText({
      system: `${params.system}\nReturn valid JSON only.${params.schemaDescription ? `\nSchema: ${params.schemaDescription}` : ""}`,
      prompt: params.prompt,
    });
    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned) as T;
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
