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
  console.log('[Blob Upload Token] ========== 开始处理请求 ==========')
  
  try {
    // 检查环境变量
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    if (!blobToken) {
      console.error('[Blob Upload Token] ❌ BLOB_READ_WRITE_TOKEN 未配置')
      return NextResponse.json(
        { error: 'Blob存储未配置，请联系管理员' },
        { status: 500 }
      )
    }
    console.log('[Blob Upload Token] ✓ BLOB_READ_WRITE_TOKEN 已配置，长度:', blobToken.length)

    // 验证用户登录状态
    let session
    try {
      session = await getServerSession(authOptions)
      console.log('[Blob Upload Token] Session结果:', session ? '已登录' : '未登录')
      if (session?.user) {
        console.log('[Blob Upload Token] 用户ID:', session.user.id)
        console.log('[Blob Upload Token] 用户邮箱:', session.user.email)
      }
    } catch (sessionError: any) {
      console.error('[Blob Upload Token] ❌ 获取Session失败:', sessionError.message)
      return NextResponse.json(
        { error: '认证服务异常，请稍后重试' },
        { status: 500 }
      )
    }

    if (!session?.user?.id) {
      console.error('[Blob Upload Token] ❌ 未授权访问 - session:', JSON.stringify(session))
      return NextResponse.json({ error: '未授权访问，请重新登录' }, { status: 401 })
    }

    // 解析请求体
    let body: HandleUploadBody
    try {
      const rawBody = await request.text()
      console.log('[Blob Upload Token] 原始请求体长度:', rawBody.length)
      body = JSON.parse(rawBody)
      console.log('[Blob Upload Token] 请求类型:', body.type)
      if (body.type === 'blob.generate-client-token') {
        console.log('[Blob Upload Token] pathname:', (body.payload as any)?.pathname)
      }
    } catch (parseError: any) {
      console.error('[Blob Upload Token] ❌ 请求体解析失败:', parseError.message)
      return NextResponse.json({ error: '请求体解析失败' }, { status: 400 })
    }

    // 使用 handleUpload 处理上传请求
    console.log('[Blob Upload Token] 调用 handleUpload...')
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log('[Blob Upload Token] onBeforeGenerateToken - pathname:', pathname)
        
        // 验证文件类型
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
        const ext = pathname.toLowerCase().substring(pathname.lastIndexOf('.'))
        
        if (!allowedExtensions.includes(ext)) {
          console.error('[Blob Upload Token] ❌ 不支持的文件类型:', ext)
          throw new Error(`不支持的文件类型: ${ext}`)
        }

        console.log('[Blob Upload Token] ✓ 文件类型验证通过:', ext)

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
        console.log('[Blob Upload Token] ✓ 文件上传完成:', blob.pathname)
        try {
          const payload = JSON.parse(tokenPayload || '{}')
          console.log('[Blob Upload Token] 上传用户:', payload.userEmail)
        } catch (e) {
          // ignore parse error
        }
      },
    })

    console.log('[Blob Upload Token] ✓ handleUpload 成功')
    console.log('[Blob Upload Token] ========== 请求处理完成 ==========')
    return NextResponse.json(jsonResponse)
  } catch (error: any) {
    console.error('[Blob Upload Token] ❌ 错误:', error.message || error)
    console.error('[Blob Upload Token] 错误堆栈:', error.stack)
    
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
