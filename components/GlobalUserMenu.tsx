'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useClerk, useUser, SignedOut, SignInButton } from '@clerk/nextjs';

interface QuotaStatus {
  canAccess: boolean;
  remaining?: number;
  isPaid: boolean;
  tier: string;
  reason?: string;
}

export const GlobalUserMenu: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    let active = true;
    const loadQuota = async () => {
      try {
        const res = await fetch('/api/quota/status');
        if (!res.ok) return;
        const data = await res.json();
        if (active) setQuota(data);
      } catch (e) {
        // ignore silently
      }
    };
    if (user) loadQuota();
    return () => {
      active = false;
    };
  }, [user]);

  const initials = useMemo(() => {
    if (!user?.fullName && !user?.emailAddresses?.[0]?.emailAddress) return '访';
    const name = user.fullName || user.emailAddresses[0].emailAddress;
    return name?.slice(0, 1).toUpperCase() || '访';
  }, [user]);

  const email = user?.emailAddresses?.[0]?.emailAddress || '未登录';
  const quotaText = useMemo(() => {
    if (!quota) return '配额：加载中';
    if (quota.isPaid) return '配额：无限（付费版）';
    if (quota.remaining === 0) return '配额：已用完';
    if (quota.remaining !== undefined) return `配额：剩余 ${quota.remaining} 篇`;
    return '配额：未知';
  }, [quota]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 rounded-full border border-teal-200 bg-white/80 backdrop-blur text-teal-700 font-semibold shadow-sm hover:bg-white">
            登录
          </button>
        </SignInButton>
      </SignedOut>

      {user && (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center hover:bg-slate-300 transition"
            aria-label="账户菜单"
          >
            {initials}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2">
              <div className="px-4 py-2">
                <p className="text-sm font-semibold text-slate-900">账户</p>
                <p className="text-xs text-slate-500 truncate">{email}</p>
              </div>
              <div className="px-4 py-2 text-xs text-slate-500">{quotaText}</div>
              <div className="border-t border-slate-100 my-2" />
              <Link
                href="/editor"
                className="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                阅读文章
              </Link>
              <Link
                href="/settings"
                className="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                设置
              </Link>
              <div className="border-t border-slate-100 my-2" />
              <button
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
