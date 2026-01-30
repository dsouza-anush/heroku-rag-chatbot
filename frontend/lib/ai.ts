import { createHerokuAI } from "heroku-ai-provider";
import { streamText, generateText } from "ai";

// Lazy-load provider and models to avoid build-time errors
let _heroku: ReturnType<typeof createHerokuAI> | null = null;

function getHeroku() {
  if (!_heroku) {
    _heroku = createHerokuAI({
      // Chat (Claude) - HEROKU_INFERENCE_TEAL_KEY
      chatApiKey: process.env.HEROKU_INFERENCE_TEAL_KEY || process.env.INFERENCE_KEY,
      chatBaseUrl: process.env.HEROKU_INFERENCE_TEAL_URL || process.env.INFERENCE_URL || "https://us.inference.heroku.com",
      // Embeddings (Cohere) - HEROKU_INFERENCE_GRAY_KEY
      embeddingsApiKey: process.env.HEROKU_INFERENCE_GRAY_KEY || process.env.EMBEDDING_KEY,
      embeddingsBaseUrl: process.env.HEROKU_INFERENCE_GRAY_URL || process.env.EMBEDDING_URL || "https://us.inference.heroku.com",
      // Reranking (Cohere) - HEROKU_INFERENCE_BLUE_KEY
      rerankingApiKey: process.env.HEROKU_INFERENCE_BLUE_KEY || process.env.RERANKING_KEY,
      rerankingBaseUrl: process.env.HEROKU_INFERENCE_BLUE_URL || process.env.RERANKING_URL || "https://us.inference.heroku.com",
    });
  }
  return _heroku;
}

function getRerankingModel() {
  return getHeroku().reranking("cohere-rerank-3-5");
}

function getChatModel() {
  return getHeroku().chat("claude-4-5-sonnet");
}

// Embedding functions - direct fetch to bypass provider issues
export async function embedText(text: string): Promise<number[]> {
  const embeddings = await embedTexts([text]);
  return embeddings[0];
}

// Sanitize text to avoid WAF blocks (remove code patterns that trigger security filters)
function sanitizeForEmbedding(text: string): string {
  return text
    // Remove URLs completely
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove email-like patterns
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    // Remove JSX/HTML-like patterns (className=, onClick=, etc.)
    .replace(/\w+\s*=\s*\{[^}]*\}/g, '')
    // Remove function calls and arrow functions
    .replace(/\([^)]*\)\s*=>/g, '')
    .replace(/\w+\([^)]*\)/g, '')
    // Remove curly braces and their contents (JSX expressions)
    .replace(/\{[^}]*\}/g, ' ')
    // Remove angle brackets (HTML/JSX tags)
    .replace(/<[^>]*>/g, ' ')
    // Remove square brackets
    .replace(/\[[^\]]*\]/g, ' ')
    // Remove backticks (code blocks)
    .replace(/`+/g, ' ')
    // Remove common code keywords that might trigger filters
    .replace(/\b(const|let|var|function|return|import|export|class|interface|type)\b/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Truncate very long texts
    .slice(0, 2000);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.HEROKU_INFERENCE_GRAY_KEY || process.env.EMBEDDING_KEY;
  const url = process.env.HEROKU_INFERENCE_GRAY_URL
    ? `${process.env.HEROKU_INFERENCE_GRAY_URL}/v1/embeddings`
    : "https://us.inference.heroku.com/v1/embeddings";

  // Sanitize texts to avoid WAF blocks
  const sanitizedTexts = texts.map(sanitizeForEmbedding);

  const body = JSON.stringify({
    model: "cohere-embed-multilingual",
    input: sanitizedTexts,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const debugInfo = `size=${body.length}, resp=${errorText.slice(0, 200)}`;
    throw new Error(`Embedding failed (${response.status}): ${debugInfo}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

// Reranking function
export interface RerankResult {
  index: number;
  relevanceScore: number;
  document: string;
}

export async function rerankDocuments(
  query: string,
  documents: string[],
  topN: number = 5
): Promise<RerankResult[]> {
  // Call model directly to avoid AI SDK compatibility issues
  const result = await getRerankingModel().doRerank({
    query,
    documents: { type: "text", values: documents },
    topN,
  });

  return result.ranking.map((r) => ({
    index: r.index,
    relevanceScore: r.relevanceScore,
    document: documents[r.index],
  }));
}

// Chat functions
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Source {
  url: string;
  title: string;
  snippet: string;
  score: number;
}

const RAG_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context.

Instructions:
1. Answer the question based ONLY on the provided context
2. If the context doesn't contain enough information, say so clearly
3. Be concise and accurate
4. When citing sources, mention the page title if available

Context will be provided in the following format:
<context>
[Source title] (relevance: X%)
Content from the source...
</context>`;

export async function generateRAGResponse(
  query: string,
  context: string
): Promise<string> {
  const { text } = await generateText({
    model: getChatModel(),
    system: RAG_SYSTEM_PROMPT,
    prompt: `Context:\n${context}\n\nQuestion: ${query}`,
  });
  return text;
}

export async function* streamRAGResponse(
  query: string,
  context: string
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.HEROKU_INFERENCE_TEAL_KEY || process.env.INFERENCE_KEY;
  const url = process.env.HEROKU_INFERENCE_TEAL_URL
    ? `${process.env.HEROKU_INFERENCE_TEAL_URL}/v1/chat/completions`
    : "https://us.inference.heroku.com/v1/chat/completions";

  // Sanitize context to avoid WAF blocks
  const sanitizedContext = context
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/`+/g, ' ')
    .replace(/import\s+/gi, '')
    .replace(/export\s+/gi, '')
    .replace(/function\s+/gi, '')
    .replace(/const\s+/gi, '')
    .replace(/=>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-4-5-sonnet",
      messages: [
        { role: "system", content: RAG_SYSTEM_PROMPT },
        { role: "user", content: `Context:\n${sanitizedContext}\n\nQuestion: ${query}` },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI] API Error:", response.status, errorText.substring(0, 300));
    yield `**Error:** API returned ${response.status}. Please try again.`;
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield "**Error:** No response body";
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      // Handle both "data: " and "data:" formats (Heroku uses no space)
      if ((line.startsWith("data:") || line.startsWith("data: ")) && !line.includes("[DONE]")) {
        try {
          const jsonStr = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
          if (!jsonStr.trim()) continue;
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

export async function generateChatResponse(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  const systemPrompt = context
    ? `${RAG_SYSTEM_PROMPT}\n\n<context>\n${context}\n</context>`
    : "You are a helpful AI assistant.";

  const { text } = await generateText({
    model: getChatModel(),
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return text;
}

export async function* streamChatResponse(
  messages: ChatMessage[],
  context?: string
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = context
    ? `${RAG_SYSTEM_PROMPT}\n\n<context>\n${context}\n</context>`
    : "You are a helpful AI assistant.";

  const result = streamText({
    model: getChatModel(),
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  for await (const chunk of result.textStream) {
    yield chunk;
  }
}

// Format context for RAG
export function formatContext(
  chunks: Array<{ content: string; title?: string; score?: number }>
): string {
  return chunks
    .map((chunk) => {
      const scoreStr = chunk.score
        ? ` (relevance: ${(chunk.score * 100).toFixed(1)}%)`
        : "";
      const title = chunk.title || "Unknown source";
      return `[${title}]${scoreStr}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}
