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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var html = document.documentElement;
                  if (theme === 'dark') {
                    html.classList.add('dark');
                  } else if (theme === 'light') {
                    html.classList.remove('dark');
                  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    html.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
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
