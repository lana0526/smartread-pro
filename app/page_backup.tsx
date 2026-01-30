'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user } = useUser();
  const router = useRouter();
  const [freeCount, setFreeCount] = useState<number>(0);

  // 读取本地已试用篇数
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = Number(localStorage.getItem('freeArticlesUsed') || '0');
    setFreeCount(Number.isFinite(stored) ? stored : 0);
  }, []);

  // 自增试用篇数
  const recordFreeUse = () => {
    if (typeof window === 'undefined') return;
    const next = freeCount + 1;
    setFreeCount(next);
    localStorage.setItem('freeArticlesUsed', String(next));
  };

  const handleStartFree = () => {
    if (!user && freeCount >= 3) {
      router.push('/sign-in?redirect_url=/editor');
      return;
    }
    if (!user) recordFreeUse();
    router.push('/editor');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      {!user && (
        <button
          onClick={() => router.push('/sign-in?redirect_url=/editor')}
          className="fixed top-4 right-4 z-30 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-teal-200 text-teal-700 font-semibold shadow-sm hover:bg-white"
        >
          登录
        </button>
      )}
      {/* 导航栏 */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-teal-600">
          智读·精练
        </Link>
        <div />
      </nav>

      <div className="container mx-auto px-4 py-16">
        {/* 头部 */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            智读·精练
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI 驱动的智能阅读学习平台
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleStartFree}
              className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition text-lg"
            >
              免费试用
            </button>
          </div>
        </header>

        {/* 功能介绍 */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg text-left">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-2xl font-bold mb-2">智能阅读</h3>
            <p className="text-gray-600">
              上传文章，AI 自动分析难度，提供个性化阅读体验
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg text-left">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-2xl font-bold mb-2">词汇学习</h3>
            <p className="text-gray-600">
              智能识别生词，AI 解释，间隔重复记忆法巩固
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
