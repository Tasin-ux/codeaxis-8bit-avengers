import React from 'react';
import { ShieldCheck, FileCheck2, GitPullRequestArrow, ScrollText } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const points = [
  { icon: FileCheck2, text: 'Guideline, terminology & claim checks' },
  { icon: GitPullRequestArrow, text: 'Two-step review before anything ships' },
  { icon: ScrollText, text: 'A decision trail for every submission' },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-paper grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between bg-ink text-white p-10 xl:p-14 relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 15%, rgba(13,148,136,0.18), transparent 42%), radial-gradient(circle at 85% 90%, rgba(13,148,136,0.10), transparent 45%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <span className="text-[15px] font-semibold tracking-tight">BrandGuard</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-teal-400/90 mb-5 font-mono">
            Brand governance
          </p>
          <h1 className="text-3xl xl:text-[2.35rem] leading-[1.15] font-semibold tracking-tight text-white">
            Publish with confidence.
            <br />
            <span className="text-stone-400">Not by accident.</span>
          </h1>
          <ul className="mt-8 space-y-3.5">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13.5px] text-stone-300">
                <Icon className="w-4 h-4 text-teal-400 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-stone-500">
          Content review &amp; compliance for marketing teams.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div className="lg:hidden mb-8 flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-teal-700" />
          <span className="text-[15px] font-semibold tracking-tight text-stone-900">
            BrandGuard
          </span>
        </div>
        <div className="w-full max-w-[400px] mx-auto">{children}</div>
      </main>
    </div>
  );
};
