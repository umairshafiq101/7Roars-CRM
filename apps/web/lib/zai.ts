import OpenAI from "openai";

const zai = new OpenAI({
  apiKey: process.env.ZAI_API_KEY || "",
  baseURL: "https://api.z.ai/api/coding/paas/v4",
});

export async function streamChatCompletion(
  systemPrompt: string,
  userPrompt: string,
) {
  const stream = await zai.chat.completions.create({
    model: "glm-4.7",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: true,
    max_tokens: 4096,
    temperature: 0.7,
  });

  return stream;
}

export { zai };
