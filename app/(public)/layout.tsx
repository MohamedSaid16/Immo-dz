/**
 * Public pages provide their own marketplace or landing-page chrome.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="public-surface min-h-screen">{children}</div>;
}
