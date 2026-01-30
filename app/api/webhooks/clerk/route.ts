import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Verification failed', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, unsafe_metadata } = evt.data
    const email = email_addresses[0].email_address
    const name = `${first_name || ''} ${last_name || ''}`.trim() || undefined
    // 创建或更新用户（不处理推荐）
    await prisma.user.upsert({
      where: { clerkId: id },
      update: { email, name },
      create: {
        clerkId: id,
        email,
        name,
        trialUsed: 0,
        trialLimit: 10,
        subscriptionTier: 'free',
        isPaid: false,
      },
    })
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0].email_address
    const name = `${first_name || ''} ${last_name || ''}`.trim() || undefined

    await prisma.user.update({
      where: { clerkId: id },
      data: { email, name }
    })
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    if (id) {
      await prisma.user.delete({
        where: { clerkId: id }
      })
    }
  }

  return new Response('Webhook received', { status: 200 })
}
