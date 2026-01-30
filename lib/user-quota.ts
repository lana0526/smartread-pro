// lib/user-quota.ts
import { prisma } from './prisma'

export interface QuotaStatus {
  canAccess: boolean
  reason?: string
  remaining?: number
  isPaid: boolean
  tier: string
}

/**
 * 检查已登录用户的配额
 */
export async function checkUserQuota(clerkId: string): Promise<QuotaStatus> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        subscriptionTier: true,
        trialUsed: true,
        trialLimit: true,
        isPaid: true,
        subscriptionEnd: true,
      },
    })

    if (!user) {
      // 用户不存在，可能是首次登录，允许访问（将在 webhook 中创建）
      return {
        canAccess: true,
        isPaid: false,
        tier: 'free',
        remaining: 10,
      }
    }

    // 付费用户：检查订阅是否过期
    if (user.isPaid) {
      if (user.subscriptionEnd && user.subscriptionEnd < new Date()) {
        return {
          canAccess: false,
          reason: 'subscription_expired',
          isPaid: false,
          tier: user.subscriptionTier,
        }
      }
      // 付费用户无限制访问
      return {
        canAccess: true,
        isPaid: true,
        tier: user.subscriptionTier,
      }
    }

    // 免费用户：检查配额
    const remaining = user.trialLimit - user.trialUsed

    if (remaining <= 0) {
      return {
        canAccess: false,
        reason: 'quota_exceeded',
        remaining: 0,
        isPaid: false,
        tier: user.subscriptionTier,
      }
    }

    return {
      canAccess: true,
      remaining,
      isPaid: false,
      tier: user.subscriptionTier,
    }
  } catch (error) {
    console.error('Error checking user quota:', error)
    // 出错时保守处理，拒绝访问
    return {
      canAccess: false,
      reason: 'error',
      isPaid: false,
      tier: 'unknown',
    }
  }
}

/**
 * 增加用户使用次数
 */
export async function incrementUserUsage(clerkId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { clerkId },
      data: {
        trialUsed: {
          increment: 1,
        },
      },
    })
  } catch (error) {
    console.error('Error incrementing user usage:', error)
  }
}

/**
 * 获取或创建用户（用于首次登录）
 */
export async function getOrCreateUser(clerkId: string, email: string, name?: string) {
  return await prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      name,
    },
    create: {
      clerkId,
      email,
      name,
      subscriptionTier: 'free',
      trialUsed: 0,
      trialLimit: 10, // 免费用户 10 篇限额
      isPaid: false,
    },
  })
}
