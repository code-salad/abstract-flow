import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codeflow — deterministic code flow visualization",
  description:
    "Map TypeScript source into deterministic, local control-flow diagrams without an LLM in the middle.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
