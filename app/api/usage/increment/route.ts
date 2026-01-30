// app/api/usage/increment/route.ts
import { NextResponse } from 'next/server'

// 用量计数已关闭，直接返回成功
export async function POST() {
  return NextResponse.json({ success: true, message: 'Usage tracking disabled' })
}
