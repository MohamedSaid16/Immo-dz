"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Share2,
  Link as LinkIcon,
  Mail,
  Send,
  MessageCircle,
  Download,
  Check,
} from "lucide-react";

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trackInteractionAction } from "@/app/dashboard/leads/actions";
import { getPropertyShareUrl } from "@/lib/site-url";
import type { InteractionEvent } from "@/lib/types";

interface PropertyShareProps {
  propertyId: string;
  agencyId: string;
  propertyTitle: string;
  canonicalUrl: string;
}

export function PropertyShare({ propertyId, agencyId, propertyTitle, canonicalUrl }: PropertyShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareAction = (method: InteractionEvent) => {
    void trackInteractionAction(propertyId, agencyId, method).catch(() => {
      console.error("[sharing:tracking]", {
        propertyId,
        method,
      });
    });
  };

  const onShareClick = async () => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobileDevice && navigator.share) {
      try {
        await navigator.share({
          title: propertyTitle,
          text: `شاهد هذا العقار الرائع على Immo DZ: ${propertyTitle}`,
          url: canonicalUrl,
        });
        handleShareAction("native_share");
        return;
      } catch {
        // Fallback to dialog if native share is cancelled or fails
      }
    }
    setIsOpen(true);
    handleShareAction("qr_code_opened");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      handleShareAction("copy_link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("[sharing:copy-link]", { propertyId });
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("property-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${propertyId.slice(0,8)}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();

        handleShareAction("qr_code_downloaded");
      }
      URL.revokeObjectURL(svgUrl);
    };
    img.onerror = () => URL.revokeObjectURL(svgUrl);
    img.src = svgUrl;
  };

  const shareLinks = [
    {
      name: "واتساب",
      icon: MessageCircle,
      href: getPropertyShareUrl("whatsapp", canonicalUrl, propertyTitle),
      action: "whatsapp_share" as const,
      color: "bg-[#25D366] hover:bg-[#25D366]/90 text-white",
    },
    {
      name: "فيسبوك",
      icon: FacebookIcon,
      href: getPropertyShareUrl("facebook", canonicalUrl, propertyTitle),
      action: "facebook_share" as const,
      color: "bg-[#1877F2] hover:bg-[#1877F2]/90 text-white",
    },
    {
      name: "تيليجرام",
      icon: Send,
      href: getPropertyShareUrl("telegram", canonicalUrl, propertyTitle),
      action: "telegram_share" as const,
      color: "bg-[#229ED9] hover:bg-[#229ED9]/90 text-white",
    },
    {
      name: "إيميل",
      icon: Mail,
      href: getPropertyShareUrl("email", canonicalUrl, propertyTitle),
      action: "email_share" as const,
      color: "bg-slate-600 hover:bg-slate-700 text-white",
    },
  ];

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onShareClick}
        className="fixed bottom-6 left-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#111111] text-white shadow-xl shadow-black/15 ring-4 ring-white transition-all hover:bg-[#333333] lg:hidden"
        aria-label="مشاركة العقار"
      >
        <Share2 className="size-6" />
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* Desktop trigger integrated in sidebar */}
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="hidden w-full gap-2 border-slate-200 lg:flex dark:border-slate-800"
            onClick={() => handleShareAction("qr_code_opened")}
          >
            <Share2 className="size-4" />
            مشاركة العقار
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>مشاركة العقار</DialogTitle>
            <DialogDescription>
              شارك هذا العقار مع عملائك بسهولة باستخدام رمز الاستجابة السريعة (QR) أو عبر وسائل التواصل.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <div className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
              <QRCodeSVG
                id="property-qr-code"
                value={canonicalUrl}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#0F172A"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <Button variant="secondary" size="sm" onClick={handleDownloadQR} className="gap-2">
              <Download className="size-4" />
              تحميل كصورة PNG
            </Button>

            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pr-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex-1 truncate text-left text-sm text-slate-500 font-mono" dir="ltr">
                {canonicalUrl}
              </div>
              <Button 
                size="sm" 
                variant={copied ? "default" : "secondary"} 
                className="shrink-0 gap-2"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
                {copied ? "تم النسخ" : "نسخ"}
              </Button>
            </div>

            <div className="grid w-full grid-cols-4 gap-3">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleShareAction(link.action)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 transition-transform hover:scale-105 active:scale-95 ${link.color}`}
                  title={link.name}
                >
                  <link.icon className="size-5" />
                </a>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
