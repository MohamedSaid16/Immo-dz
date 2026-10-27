import Link from "next/link";
import { ArrowRight, Building2, Home, Users, TrendingUp, ShieldCheck } from "lucide-react";
import Image from "next/image";

import { Brand } from "@/components/brand";

const benefits = [
  { icon: Building2, text: "إدارة العقارات باحترافية" },
  { icon: Users, text: "استقبال وإدارة العملاء المحتملين" },
  { icon: TrendingUp, text: "متابعة الطلبات وزيادة المبيعات" },
  { icon: Home, text: "نشر العقارات بسهولة وسرعة" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-surface relative grid min-h-screen lg:grid-cols-[55%_45%] bg-background">
      {/* Marketing Panel (Left Side - 55%) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#111111] p-12 text-white">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
            alt="Luxury Real Estate"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-[#111111]/85 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/70 to-transparent" />
        </div>

        {/* Top Section */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-white"><Image src="/logo.svg" alt="Immo DZ" width={120} height={36} className="h-9 w-auto" />Immo DZ</Link>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <ShieldCheck className="size-4 text-white" />
            <span className="text-sm font-medium">منصة آمنة 100%</span>
          </div>
        </div>

        {/* Middle Section */}
        <div className="relative z-10 flex flex-col gap-10 max-w-xl mt-12">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white drop-shadow-md">
              منصة احترافية لإدارة وكالتك العقارية وزيادة عملائك
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-lg drop-shadow">
              ارتقِ بأعمالك إلى مستوى جديد. أدوات متطورة مصممة خصيصاً للوكالات العقارية في الجزائر لتحقيق أقصى قدر من المبيعات.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/10 hover:border-white/20">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <benefit.icon className="size-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-100">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="relative z-10 flex items-center justify-between text-sm text-slate-400 mt-12">
          <div className="flex items-center gap-6">
            <span className="font-medium text-white/70 hover:text-white transition-colors">Powered by Immo DZ</span>
            <span className="hidden xl:inline-block font-medium text-white/70 hover:text-white transition-colors">Built for Algerian Agencies</span>
          </div>
          <p>© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
        </div>
      </div>

      {/* Authentication Form Panel (Right Side - 45%) */}
      <div className="flex flex-col relative bg-[#F8FAFC] dark:bg-slate-950">
        
        {/* Mobile Header */}
        <div className="flex items-center justify-center p-6 lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <Link href="/">
            <Brand />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-8 relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white mb-2"
            >
              <ArrowRight className="size-4" />
              العودة إلى الرئيسية · Accueil
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
