import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export const runtime = 'nodejs'

/**
 * Vercel Blob 客户端上传 Token API
 * 
 * 这个API为前端提供上传token，允许前端直接上传文件到Vercel Blob
 * 绕过了Vercel Serverless Functions的4.5MB请求体限制
 * 支持最大500MB的文件上传
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json() as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 验证文件类型
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
        const ext = pathname.toLowerCase().substring(pathname.lastIndexOf('.'))
        
        if (!allowedExtensions.includes(ext)) {
          throw new Error(`不支持的文件类型: ${ext}`)
        }

        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          tokenPayload: JSON.stringify({
            userId: session.user?.email,
            uploadedAt: new Date().toISOString(),
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 文件上传完成后的回调
        console.log('[Blob Upload] 文件上传完成:', blob.pathname)
        console.log('[Blob Upload] Token Payload:', tokenPayload)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error: any) {
    console.error('[Blob Upload Token] 错误:', error)
    return NextResponse.json(
      { error: error.message || '获取上传token失败' },
      { status: 500 }
    )
  }
}
