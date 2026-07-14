import React from "react";
import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";
import { JsonLd } from "./json-ld";
import { getAbsoluteUrl } from "@/lib/site-url";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? getAbsoluteUrl(item.href) : undefined,
    })),
  };

  return (
    <>
      <JsonLd schema={schema} />
      <nav aria-label="Breadcrumb" className="mb-4 flex">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Home className="size-4" />
              <span className="sr-only">الرئيسية</span>
            </Link>
          </li>
          
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            
            return (
              <li key={index} className="flex items-center gap-2">
                <ChevronLeft className="size-4 text-muted-foreground/50" />
                {isLast || !item.href ? (
                  <span
                    className="font-medium text-foreground"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
