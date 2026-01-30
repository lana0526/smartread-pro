'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const perks = {
  basic: ['?? 3 ???', 'AI ?? / ????', '????????'],
  pro: ['??????', '?? AI ?????', '????? & ??', '??????'],
  topup: ['???? 20 ???', '????????', '????????'],
};

export default function PricingPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef9f6] via-white to-[#eef3ff] py-12">
      <div className="container mx-auto px-4 space-y-10">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-2 text-teal-700 font-bold text-xl hover:text-teal-800">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold">?</span>
            <span>?????</span>
          </Link>
        </div>
        {reason === 'quota_exceeded' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-3xl mx-auto shadow-sm">
            <h2 className="text-2xl font-bold text-amber-900 mb-2">?????????</h2>
            <p className="text-amber-800">??????????????????????</p>
          </div>
        )}

        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">????</h1>
          <p className="text-slate-600 text-lg">???????????????????????</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 flex flex-col">
            <div className="space-y-2 mb-4">
              <h3 className="text-xl font-semibold text-slate-900">???</h3>
              <p className="text-4xl font-bold text-slate-900">
                ?? <span className="text-base font-normal text-slate-500">/?</span>
              </p>
              <p className="text-sm text-slate-500">?????????</p>
            </div>
            <ul className="space-y-2 text-slate-700 mb-6">
              {perks.basic.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">?</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <Link
                href="/editor"
                className="block w-full py-3 rounded-full bg-slate-900 text-white font-semibold text-center hover:bg-slate-800 transition"
              >
                ????
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#e0f2ff] via-white to-[#f0f9ff] rounded-3xl shadow-xl border-2 border-sky-500 p-6 flex flex-col relative">
            <div className="absolute -top-3 right-6 px-4 py-1 rounded-full bg-sky-500 text-white text-sm font-semibold shadow-sm">
              ??
            </div>
            <div className="space-y-2 mb-4">
              <h3 className="text-xl font-semibold text-slate-900">???</h3>
              <p className="text-4xl font-bold text-slate-900">
                ?29 <span className="text-base font-normal text-slate-500">/?</span>
              </p>
              <p className="text-sm text-slate-500">?????????</p>
            </div>
            <ul className="space-y-2 text-slate-700 mb-6">
              {perks.pro.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">?</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <Link
                href="/api/checkout?plan=pro-monthly"
                className="block w-full py-3 rounded-full bg-slate-900 text-white font-semibold text-center hover:bg-slate-800 transition"
              >
                ????
              </Link>
              <p className="text-xs text-slate-500 text-center mt-2">???? 2 ????????</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 flex flex-col">
            <div className="space-y-2 mb-4">
              <h3 className="text-xl font-semibold text-slate-900">???</h3>
              <p className="text-4xl font-bold text-slate-900">
                ?9.9 <span className="text-base font-normal text-slate-500">/?</span>
              </p>
              <p className="text-sm text-slate-500">??????????</p>
            </div>
            <ul className="space-y-2 text-slate-700 mb-6">
              {perks.topup.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">?</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <Link
                href="/api/checkout?plan=topup-20"
                className="block w-full py-3 rounded-full border border-slate-300 text-slate-800 font-semibold text-center hover:bg-slate-50 transition"
              >
                ????
              </Link>
              <p className="text-xs text-slate-500 text-center mt-2">???????????</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
