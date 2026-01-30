// app/api/usage/increment/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { incrementUserUsage } from '@/lib/user-quota'

/**
 * 记录用户完成一篇文章
 * 仅支持已登录用户
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    // 必须登录
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      )
    }

    // 增加使用次数
    await incrementUserUsage(userId)
    console.log('✅ 用户使用次数 +1:', userId)

    return NextResponse.json({ 
      success: true,
      message: 'Usage recorded'
    })

  } catch (error) {
    console.error('❌ 记录使用次数错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}