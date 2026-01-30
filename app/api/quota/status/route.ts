// app/api/quota/status/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkUserQuota } from '@/lib/user-quota'

/**
 * 获取当前用户的配额状态
 * 仅支持已登录用户
 */
export async function GET() {
  try {
    const { userId } = await auth()

    // 未登录用户
    if (!userId) {
      return NextResponse.json({
        canAccess: false,
        remaining: 0,
        isPaid: false,
        tier: 'none',
        reason: 'not_logged_in',
        message: '请登录后使用'
      })
    }

    // 已登录用户 - 返回配额状态
    const quotaStatus = await checkUserQuota(userId)
    return NextResponse.json(quotaStatus)
    
  } catch (error) {
    console.error('Error getting quota status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}