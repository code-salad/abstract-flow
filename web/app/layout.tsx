import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codeflow",
  description: "Deterministic code flow visualization — no LLM in between.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-200 antialiased">
        {children}
      </body>
    </html>
  );
}
