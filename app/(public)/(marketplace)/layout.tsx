import { LandingNavbar } from "@/components/landing/landing-navbar";
import { SiteFooter } from "@/components/landing/site-footer";
import { listAgencies } from "@/lib/properties";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const agencies = await listAgencies(12);

  return (
    <div className="public-surface flex min-h-screen flex-col bg-background">
      <LandingNavbar agencies={agencies} />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
