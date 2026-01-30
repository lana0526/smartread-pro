// lib/anonymous-trial.ts
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.TRIAL_TOKEN_SECRET || 'your-secret-key-change-in-production'
)

export interface TrialState {
  used: number
  limit: number
  createdAt: number
}

const DEFAULT_LIMIT = 3 // 免费试用 3 篇

/**
 * 创建新的匿名试用 token
 */
export async function createTrialToken(): Promise<string> {
  const state: TrialState = {
    used: 0,
    limit: DEFAULT_LIMIT,
    createdAt: Date.now(),
  }

  const token = await new SignJWT({ state })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d') // 30 天过期
    .sign(SECRET)

  return token
}

/**
 * 验证并解析 token
 */
export async function verifyTrialToken(token: string): Promise<TrialState | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload.state as TrialState
  } catch (error) {
    return null
  }
}

/**
 * 增加使用次数
 */
export async function incrementTrialUsage(token: string): Promise<string> {
  const state = await verifyTrialToken(token)
  
  if (!state) {
    throw new Error('Invalid token')
  }

  const updatedState: TrialState = {
    ...state,
    used: state.used + 1,
  }

  const newToken = await new SignJWT({ state: updatedState })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)

  return newToken
}

/**
 * 检查是否还有试用额度
 */
export async function hasTrialQuota(token: string | undefined): Promise<boolean> {
  if (!token) return true // 新用户，允许创建 token
  
  const state = await verifyTrialToken(token)
  if (!state) return true // token 无效，允许创建新的
  
  return state.used < state.limit
}

/**
 * 获取剩余试用次数
 */
export async function getRemainingTrials(token: string | undefined): Promise<number> {
  if (!token) return DEFAULT_LIMIT
  
  const state = await verifyTrialToken(token)
  if (!state) return DEFAULT_LIMIT
  
  return Math.max(0, state.limit - state.used)
}