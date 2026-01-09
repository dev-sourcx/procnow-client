import type { Metadata } from "next";
import "./globals.css";
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";
import ToastContainer from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "Chat Assistant",
  description: "AI Chat Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProviderWrapper>
        {children}
        <ToastContainer />
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}

