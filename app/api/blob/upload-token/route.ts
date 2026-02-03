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
    // 检查环境变量
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[Blob Upload Token] BLOB_READ_WRITE_TOKEN 未配置')
      return NextResponse.json(
        { error: 'Blob存储未配置，请联系管理员' },
        { status: 500 }
      )
    }

    // 验证用户登录状态
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('[Blob Upload Token] 未授权访问')
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    console.log('[Blob Upload Token] 用户:', session.user.email)

    // 解析请求体
    let body: HandleUploadBody
    try {
      body = await request.json()
      console.log('[Blob Upload Token] 请求类型:', body.type)
    } catch (parseError) {
      console.error('[Blob Upload Token] 请求体解析失败:', parseError)
      return NextResponse.json({ error: '请求体解析失败' }, { status: 400 })
    }

    // 使用 handleUpload 处理上传请求
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log('[Blob Upload Token] 生成token，pathname:', pathname)
        
        // 验证文件类型
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
        const ext = pathname.toLowerCase().substring(pathname.lastIndexOf('.'))
        
        if (!allowedExtensions.includes(ext)) {
          console.error('[Blob Upload Token] 不支持的文件类型:', ext)
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
            userId: session.user?.id,
            userEmail: session.user?.email,
            uploadedAt: new Date().toISOString(),
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 文件上传完成后的回调
        console.log('[Blob Upload Token] 文件上传完成:', blob.pathname)
        try {
          const payload = JSON.parse(tokenPayload || '{}')
          console.log('[Blob Upload Token] 上传用户:', payload.userEmail)
        } catch (e) {
          // ignore parse error
        }
      },
    })

    console.log('[Blob Upload Token] 响应成功')
    return NextResponse.json(jsonResponse)
  } catch (error: any) {
    console.error('[Blob Upload Token] 错误:', error.message || error)
    
    // 返回更详细的错误信息
    return NextResponse.json(
      { 
        error: error.message || '获取上传token失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
