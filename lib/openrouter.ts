export class OpenRouterClient {
  private apiKey: string
  private baseURL: string = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chat(params: {
    model: string
    messages: Array<{ role: string; content: string }>
    response_format?: any
    temperature?: number
    max_tokens?: number
  }) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        response_format: params.response_format,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 8000,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`)
    }

    return response.json()
  }
}

export const openrouter = new OpenRouterClient(
  process.env.OPENROUTER_API_KEY || ''
)
