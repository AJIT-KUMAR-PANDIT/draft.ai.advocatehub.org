import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AISidebar from "@/components/ui/ai-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Draft@advoAI · Legal AI Assistant",
  description: "AI-powered legal drafting assistant by AdvocateHub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex overflow-hidden ">
        {/* Side navigation */}
        <AISidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
