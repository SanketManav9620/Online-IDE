/**
 * Unified AI Provider Client
 * Supports xAI (Grok), Groq, OpenAI, Google Gemini, and local Ollama.
 */

export type AIProviderType = "grok" | "groq" | "openai" | "gemini" | "ollama"

interface AICompletionOptions {
  systemPrompt?: string
  prompt: string
  temperature?: number
  maxTokens?: number
}

interface AIChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface AIChatOptions {
  messages: AIChatMessage[]
  temperature?: number
  maxTokens?: number
}

export function detectAIProvider(): {
  provider: AIProviderType
  apiKey?: string
  model: string
  baseUrl: string
} {
  const explicitProvider = process.env.AI_PROVIDER?.toLowerCase() as AIProviderType | undefined

  // 1. Grok (xAI)
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY
  if (explicitProvider === "grok" || (!explicitProvider && grokKey)) {
    return {
      provider: "grok",
      apiKey: grokKey,
      model: process.env.GROK_MODEL || "grok-2",
      baseUrl: process.env.GROK_BASE_URL || "https://api.x.ai/v1",
    }
  }

  // 2. Groq (Ultra-low latency inference, best for instant autocomplete)
  const groqKey = process.env.GROQ_API_KEY
  if (explicitProvider === "groq" || (!explicitProvider && groqKey)) {
    return {
      provider: "groq",
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    }
  }

  // 3. OpenAI
  const openaiKey = process.env.OPENAI_API_KEY
  if (explicitProvider === "openai" || (!explicitProvider && openaiKey)) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    }
  }

  // 4. Google Gemini (OpenAI-compatible endpoint)
  const geminiKey = process.env.GEMINI_API_KEY
  if (explicitProvider === "gemini" || (!explicitProvider && geminiKey)) {
    return {
      provider: "gemini",
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      baseUrl:
        process.env.GEMINI_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai",
    }
  }

  // 5. Default fallback: Ollama
  return {
    provider: "ollama",
    apiKey: undefined,
    model: process.env.OLLAMA_MODEL || "codellama",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  }
}

/**
 * Generate code completion using detected AI provider
 */
export async function generateAICompletion(options: AICompletionOptions): Promise<string> {
  const config = detectAIProvider()

  if (config.provider === "ollama") {
    return generateOllamaCompletion(config.baseUrl, config.model, options)
  }

  return generateOpenAICompatibleCompletion(config.baseUrl, config.apiKey || "", config.model, [
    ...(options.systemPrompt ? [{ role: "system" as const, content: options.systemPrompt }] : []),
    { role: "user" as const, content: options.prompt },
  ], {
    temperature: options.temperature ?? 0.1,
    maxTokens: options.maxTokens ?? 250,
  })
}

/**
 * Generate multi-turn chat response using detected AI provider
 */
export async function generateAIChat(options: AIChatOptions): Promise<string> {
  const config = detectAIProvider()

  if (config.provider === "ollama") {
    const prompt = options.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n")
    return generateOllamaCompletion(config.baseUrl, config.model, {
      prompt,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
    })
  }

  return generateOpenAICompatibleCompletion(
    config.baseUrl,
    config.apiKey || "",
    config.model,
    options.messages,
    {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1200,
    }
  )
}

/**
 * Handler for OpenAI-compatible providers (xAI Grok, Groq, OpenAI, Google Gemini)
 */
async function generateOpenAICompatibleCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: AIChatMessage[],
  opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!apiKey) {
    throw new Error("Missing API Key for AI provider")
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.1,
      max_tokens: opts.maxTokens ?? 250,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[AI Provider Error] ${response.status}: ${errText}`)
    throw new Error(`AI Provider returned status ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ""
  return content
}

/**
 * Handler for local Ollama
 */
async function generateOllamaCompletion(
  baseUrl: string,
  model: string,
  options: AICompletionOptions
): Promise<string> {
  const cleanBase = baseUrl.replace(/\/+$/, "")
  const fullPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${options.prompt}`
    : options.prompt

  const response = await fetch(`${cleanBase}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
        num_predict: options.maxTokens ?? 250,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama service error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.response || ""
}

