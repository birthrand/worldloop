import { env } from "../config/env.js";
import { HttpError } from "./http.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1).trim();
  }

  return trimmed;
}

export async function createStructuredChatCompletion(
  messages: ChatMessage[],
): Promise<string> {
  if (!env.openAiApiKey) {
    throw new HttpError(
      "OPENAI_API_KEY is not configured",
      503,
      "AI_SERVICE_UNAVAILABLE",
    );
  }

  const response = await fetch(`${env.openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openAiModel,
      messages,
      temperature: 0.7,
      response_format: {
        type: "json_object",
      },
    }),
  });

  if (!response.ok) {
    throw new HttpError(
      `LLM request failed with status ${response.status}`,
      502,
      "AI_PROVIDER_ERROR",
    );
  }

  const data = (await response.json()) as OpenAiChatResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new HttpError("LLM returned empty content", 502, "AI_EMPTY_RESPONSE");
  }

  return extractJsonObject(content);
}
