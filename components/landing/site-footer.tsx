import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { WhatsAppIcon } from "@/components/public/property-card";
import { listAgencies } from "@/lib/properties";

// Brand icons (lucide removed its brand marks, so we inline them).
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.9 4.3 18.5 20c-.2 1-.9 1.3-1.8.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9L18 6.4c.4-.3-.1-.5-.6-.2L7.2 12.6l-4.7-1.5c-1-.3-1-1 .2-1.5l18.4-7.1c.9-.3 1.6.2 1.3 1.4z" />
    </svg>
  );
}

const socials = [
  { icon: FacebookIcon, label: "Facebook", href: "#" },
  { icon: InstagramIcon, label: "Instagram", href: "#" },
  { icon: WhatsAppIcon, label: "WhatsApp", href: "#" },
  { icon: TelegramIcon, label: "Telegram", href: "#" },
];

const navLinks = [
  { label: "Vente", href: "/biens?transaction=sale" },
  { label: "Location", href: "/biens?transaction=rent" },
  { label: "Tous les biens", href: "/biens" },
  { label: "Carte", href: "/carte" },
  { label: "Estimation", href: "#" },
];

export async function SiteFooter() {
  const agencies = await listAgencies(6);

  return (
    <footer id="contact" dir="ltr" className="bg-[#0a0a14] text-[#f5f0e8]/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand + socials */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Immo DZ" className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-tight text-[#f5f0e8]">
              Immo<span className="text-[#c9a84c]"> DZ</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[#f5f0e8]/55">
            المنصة العقارية الجزائرية المتكاملة — من البحث إلى إتمام الصفقة، كل
            ما تحتاجه في مكان واحد.
          </p>
          <div className="flex items-center gap-2">
            {socials.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex size-9 items-center justify-center rounded-full bg-white/5 text-[#f5f0e8]/80 transition-colors hover:bg-[#c9a84c] hover:text-[#1a1a2e]"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#f5f0e8]">
            Navigation
          </h3>
          <ul className="space-y-2 text-sm">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-[#f5f0e8]/65 transition-colors hover:text-[#c9a84c]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Agencies */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#f5f0e8]">
            Agences
          </h3>
          {agencies.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {agencies.map((agency) => (
                <li key={agency.id}>
                  <Link
                    href={`/agences/${agency.id}`}
                    className="text-[#f5f0e8]/65 transition-colors hover:text-[#c9a84c]"
                  >
                    {agency.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#f5f0e8]/45">قريبًا — سجّل وكالتك الآن.</p>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#f5f0e8]">
            Contact
          </h3>
          <ul className="space-y-3 text-sm text-[#f5f0e8]/65">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#c9a84c]" />
              شارع ديدوش مراد، الجزائر الوسطى
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-[#c9a84c]" />
              <span dir="ltr">+213 555 21 44 08</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-[#c9a84c]" />
              <span dir="ltr">contact@immo-dz.com</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-[#c9a84c]" />
              الأحد - الخميس: 9:00 - 17:00
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-[#f5f0e8]/45 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Immo DZ — Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="transition-colors hover:text-[#c9a84c]">
              Mentions légales
            </a>
            <a href="#" className="transition-colors hover:text-[#c9a84c]">
              Confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
