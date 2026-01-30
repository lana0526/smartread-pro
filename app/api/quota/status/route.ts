// app/api/quota/status/route.ts
import { NextResponse } from 'next/server'

// 配额功能暂时关闭：始终返回可访问
export async function GET() {
  return NextResponse.json({
    canAccess: true,
    remaining: 9999,
    isPaid: false,
    tier: 'free',
    reason: 'disabled',
  })
}
