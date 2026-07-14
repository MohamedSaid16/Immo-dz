import { Sparkles } from "lucide-react";

/**
 * Floating AI-assistant button (UI only — no behaviour yet).
 * Fixed bottom-right on every public page, golden with a subtle pulse and a
 * hover tooltip.
 */
export function AiChatButton() {
  return (
    <div className="group fixed bottom-6 right-6 z-50">
      {/* Tooltip on hover */}
      <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1a1a2e] px-3 py-1.5 text-sm font-medium text-[#f5f0e8] opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        Assistant Immo DZ
      </span>

      {/* Attention pulse ring */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#c9a84c]/40"
      />

      <button
        type="button"
        aria-label="Assistant Immo DZ"
        className="flex size-14 items-center justify-center rounded-full bg-[#c9a84c] text-[#1a1a2e] shadow-[0_4px_20px_rgba(201,168,76,0.4)] transition-transform duration-200 hover:scale-110 hover:bg-[#b8963f]"
      >
        <Sparkles className="size-6" />
      </button>
    </div>
  );
}
