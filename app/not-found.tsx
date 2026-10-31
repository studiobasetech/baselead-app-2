import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#3B82F6]">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">This page doesn’t exist</h1>
      <p className="mt-2 max-w-md text-gray-400">The link may be old or mistyped.</p>
      <Link href="/today" className="mt-6 rounded-xl bg-[#3B82F6] px-5 py-2.5 font-semibold text-white hover:bg-[#2F74E8]">Go to BaseLead</Link>
    </main>
  );
}
