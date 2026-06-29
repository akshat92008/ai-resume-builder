import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1"
});

async function testModel(model: string) {
  const start = Date.now();
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Write a 500-word essay about the history of artificial intelligence." }],
      max_tokens: 1024,
    });
    console.log(`${model} took ${(Date.now() - start)/1000} seconds. Tokens generated: ${completion.usage?.completion_tokens}`);
  } catch (err: any) {
    console.error(`${model} failed:`, err.message);
  }
}

async function run() {
  await testModel("meta/llama-3.1-8b-instruct");
  await testModel("meta/llama-3.3-70b-instruct");
}

run();
