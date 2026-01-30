import { prisma } from './prisma'

/**
 * 处理推荐注册
 */
export async function handleReferralSignup(
  newUserId: string,
  email: string,
  name: string | undefined,
  referralCode?: string
) {
  try {
    // 创建用户（带推荐码检查）
    const userData: any = {
      clerkId: newUserId,
      email,
      name,
      trialUsed: 0,
      referralBonus: 0,
    }

    if (referralCode) {
      // 查找推荐人
      const referrer = await prisma.user.findUnique({
        where: { referralCode }
      })

      if (referrer) {
        // 给新用户额外奖励
        userData.referredBy = referralCode
        userData.referralBonus = 2  // 新用户额外 2 篇

        // 创建新用户
        const newUser = await prisma.user.create({
          data: userData
        })

        // 奖励推荐人
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            referralBonus: {
              increment: 5  // 推荐人得 5 篇
            }
          }
        })

        // 记录推荐关系
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            refereeId: newUser.id,
            bonus: 5
          }
        })

        return newUser
      }
    }

    // 没有推荐码，正常创建
    return await prisma.user.create({
      data: userData
    })

  } catch (error) {
    console.error('Referral signup error:', error)
    throw error
  }
}

/**
 * 获取用户推荐统计
 */
export async function getReferralStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referrals: {
        include: {
          referrer: {
            select: {
              email: true,
              name: true,
              createdAt: true
            }
          }
        }
      }
    }
  })

  return {
    referralCode: user?.referralCode,
    totalReferrals: user?.referrals.length || 0,
    totalBonus: user?.referralBonus || 0,
    referrals: user?.referrals || []
  }
}