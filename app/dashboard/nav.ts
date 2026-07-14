import {
  Building2,
  LayoutDashboard,
  Map,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Not part of Phase 1 — shown for context but not yet navigable. */
  soon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
  { label: "العقارات", href: "/dashboard/properties", icon: Building2 },
  { label: "العملاء", href: "/dashboard/leads", icon: Users },
  { label: "الخريطة", href: "/dashboard/map", icon: Map, soon: true },
  { label: "الإعدادات", href: "/dashboard/settings", icon: Settings, soon: true },
];
