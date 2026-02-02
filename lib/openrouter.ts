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
    // Create AbortController for timeout - 5 minutes for large documents
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout
    
    try {
      console.log(`[OpenRouter] 发送请求到模型: ${params.model}`)
      console.log(`[OpenRouter] 消息长度: ${params.messages.reduce((acc, m) => acc + m.content.length, 0)} 字符`)
      
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
          max_tokens: params.max_tokens ?? 16000,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`[OpenRouter] 响应状态: ${response.status}`)

      if (!response.ok) {
        let errorMessage = response.statusText
        let errorBody = ''
        try {
          errorBody = await response.text()
          console.error(`[OpenRouter] 错误响应体: ${errorBody.substring(0, 500)}`)
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(errorBody)
            errorMessage = errorData.error?.message || errorData.message || errorMessage
          } catch {
            // If not JSON, use the raw text (truncated)
            if (errorBody.length > 100) {
              errorMessage = `${errorBody.substring(0, 100)}...`
            } else {
              errorMessage = errorBody || errorMessage
            }
          }
        } catch (e) {
          // If we can't read the body, use status text
          console.error(`[OpenRouter] 无法读取错误响应体: ${e}`)
        }
        
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('API请求频率限制，请稍后重试')
        } else if (response.status === 503 || response.status === 502) {
          throw new Error('AI服务暂时不可用，请稍后重试')
        } else if (response.status === 413) {
          throw new Error('文档内容过大，请尝试上传较小的文件')
        }
        
        throw new Error(`OpenRouter API错误 (${response.status}): ${errorMessage}`)
      }

      // Read response body
      const responseText = await response.text()
      console.log(`[OpenRouter] 响应长度: ${responseText.length} 字符`)
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        throw new Error('AI服务返回空响应，请稍后重试')
      }
      
      // Try to parse JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[OpenRouter] JSON解析失败: ${responseText.substring(0, 200)}`)
        throw new Error(`AI响应格式错误: ${responseText.substring(0, 50)}...`)
      }
      
      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`[OpenRouter] 响应结构无效:`, JSON.stringify(data).substring(0, 500))
        throw new Error('AI服务返回了无效的响应格式')
      }

      // Check for finish reason
      const finishReason = data.choices[0].finish_reason
      if (finishReason === 'length') {
        console.warn('[OpenRouter] 响应被截断 (finish_reason: length)')
      }

      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error('AI分析超时（5分钟），请尝试上传较小的文件或稍后重试')
      }
      
      // Re-throw with better message
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error('无法连接到AI服务，请检查网络或稍后重试')
      }
      
      throw error
    }
  }
}

export const openrouter = new OpenRouterClient(
  process.env.OPENROUTER_API_KEY || ''
)
