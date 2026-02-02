import pdf from 'pdf-parse'
import * as XLSX from 'xlsx'

// Maximum text length to send to AI (to avoid token limits)
const MAX_TEXT_LENGTH = 150000 // ~37k tokens for GPT-4

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log(`[PDF解析] 开始解析PDF, 文件大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
    
    // Options for pdf-parse
    const options = {
      // Limit pages for very large documents
      max: 200, // Max 200 pages
    }
    
    const data = await pdf(buffer, options)
    
    console.log(`[PDF解析] 成功提取 ${data.numpages} 页, ${data.text.length} 字符`)
    
    // Clean up extracted text
    let text = data.text
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ')
    
    // Remove common PDF artifacts
    text = text.replace(/\f/g, '\n') // Form feed to newline
    text = text.replace(/\x00/g, '') // Null characters
    
    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      console.log(`[PDF解析] 文本过长 (${text.length} 字符), 截断至 ${MAX_TEXT_LENGTH} 字符`)
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[文档内容已截断，仅显示前150,000字符]'
    }
    
    return text
  } catch (error: any) {
    console.error('[PDF解析] 错误:', error.message)
    
    // Try alternative parsing approach for problematic PDFs
    try {
      console.log('[PDF解析] 尝试备用解析方法...')
      const data = await pdf(buffer, { max: 50 }) // Try with fewer pages
      if (data.text && data.text.length > 100) {
        console.log(`[PDF解析] 备用方法成功, 提取 ${data.text.length} 字符`)
        return data.text.substring(0, MAX_TEXT_LENGTH)
      }
    } catch (fallbackError) {
      console.error('[PDF解析] 备用方法也失败:', fallbackError)
    }
    
    throw new Error(`PDF解析失败: ${error.message}`)
  }
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    let text = ''
    
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      text += `\n\n=== ${sheetName} ===\n\n`
      text += XLSX.utils.sheet_to_txt(sheet)
    })
    
    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[文档内容已截断]'
    }
    
    return text
  } catch (error) {
    console.error('Excel parsing error:', error)
    throw new Error('Failed to parse Excel document')
  }
}

export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(buffer)
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return extractTextFromExcel(buffer)
  } else if (mimeType.startsWith('text/')) {
    let text = buffer.toString('utf-8')
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[文档内容已截断]'
    }
    return text
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`)
  }
}
