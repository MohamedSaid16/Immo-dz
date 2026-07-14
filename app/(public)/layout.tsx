import { AiChatButton } from "@/components/public/ai-chat-button";

/**
 * Wraps every public page (landing + marketplace) to mount the floating
 * AI-assistant button. No chrome here — the landing and marketplace layouts
 * supply their own header/footer.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AiChatButton />
    </>
  );
}
