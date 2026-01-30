'use client';

import { useUser } from '@clerk/nextjs'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-teal-600">
            智读·精练
          </Link>
          <div className="flex items-center gap-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="container mx-auto px-4 py-12">
        {/* 欢迎区域 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            欢迎回来，{user?.firstName || user?.username || '用户'}！
          </h1>
          <p className="text-gray-600">
            继续您的学习之旅
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-4xl mb-2">📚</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              已阅读文章
            </h3>
            <p className="text-3xl font-bold text-teal-600">0</p>
            <p className="text-sm text-gray-500 mt-2">
              本月配额：10 篇（免费版）
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-4xl mb-2">📝</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              学习词汇
            </h3>
            <p className="text-3xl font-bold text-teal-600">0</p>
            <p className="text-sm text-gray-500 mt-2">
              继续积累您的词汇库
            </p>
          </div>

        </div>

        {/* 快速操作 */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/editor"
            className="bg-teal-600 text-white rounded-xl shadow-lg p-8 hover:bg-teal-700 transition group"
          >
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold mb-2">开始新的阅读</h3>
            <p className="text-teal-100">
              上传文章，开始 AI 辅助阅读
            </p>
            <div className="mt-4 flex items-center text-teal-100 group-hover:translate-x-2 transition">
              立即开始 →
            </div>
          </Link>
        </div>

        {/* 最近文章 */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            最近阅读
          </h2>
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-lg">还没有阅读记录</p>
            <p className="text-sm mt-2">开始您的第一篇文章吧！</p>
            <Link
              href="/editor"
              className="inline-block mt-6 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition"
            >
              开始阅读
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
