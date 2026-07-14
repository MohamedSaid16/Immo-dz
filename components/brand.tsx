import { cn } from "@/lib/utils";

export function Brand({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Immo DZ" className="h-9 w-auto" />
      {showText && (
        <span className="text-lg font-extrabold tracking-tight text-foreground">
          Immo<span className="text-primary"> DZ</span>
        </span>
      )}
    </div>
  );
}
