import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GhostWriter AI — AI Songwriting Assistant",
  description:
    "Turn ideas and beats into polished lyrics with AI-powered style transfer, structured song sections, and iterative refinement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
