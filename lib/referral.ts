import { prisma } from './prisma'

/**
 * 处理推荐注册
 */
export async function handleReferralSignup(
  newUserId: string,
  email: string,
  name: string | undefined,
  _referralCode?: string
) {
  try {
    // 推荐功能暂时关闭：直接创建/更新用户，避免 schema 缺少 referralCode 造成构建失败
    const user = await prisma.user.upsert({
      where: { clerkId: newUserId },
      update: { email, name },
      create: {
        clerkId: newUserId,
        email,
        name,
        trialUsed: 0,
        trialLimit: 10,
        referralBonus: 0,
        subscriptionTier: 'free',
        isPaid: false,
      },
    })
    return user
  } catch (error) {
    console.error('Referral signup error:', error)
    throw error
  }
}

/**
 * 获取用户推荐统计
 */
export async function getReferralStats(userId: string) {
  // 推荐统计功能暂未启用，返回默认值
  return {
    referralCode: undefined,
    totalReferrals: 0,
    totalBonus: 0,
    referrals: []
  }
}
