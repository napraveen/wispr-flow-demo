import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vox PR — Spoken Code Reviews Grounded in Real Diffs",
  description: "Dictate code reviews naturally using Wispr Flow. Grounded to exact diff coordinates and posted to GitHub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#0d1117] text-[#c9d1d9] antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
