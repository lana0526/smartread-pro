// Referral feature disabled
export async function handleReferralSignup() { return null }
export async function getReferralStats() {
  return { referralCode: undefined, totalReferrals: 0, totalBonus: 0, referrals: [] }
}
