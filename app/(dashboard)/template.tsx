// Re-mounts on every page change, so each page fades in smoothly.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="bl-page-enter">{children}</div>;
}
