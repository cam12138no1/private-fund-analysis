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
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 240000) // 4 minutes timeout
    
    try {
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
          max_tokens: params.max_tokens ?? 16000, // Increased for longer responses
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = response.statusText
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorMessage
        } catch (e) {
          // If we can't parse error JSON, use status text
        }
        throw new Error(`OpenRouter API错误: ${errorMessage}`)
      }

      const data = await response.json()
      
      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('OpenRouter API返回了无效的响应格式')
      }

      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error('API请求超时，请稍后重试')
      }
      
      throw error
    }
  }
}

export const openrouter = new OpenRouterClient(
  process.env.OPENROUTER_API_KEY || ''
)
