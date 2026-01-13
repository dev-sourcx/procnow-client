import type { Metadata } from "next";
import "./globals.css";
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";
import ToastContainer from "@/components/ToastContainer";
import DashboardLayout from "@/components/DashboardLayout";

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
        <DashboardLayout>
          {children}
        </DashboardLayout>
        <ToastContainer />
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
