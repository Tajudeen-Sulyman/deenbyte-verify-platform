import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalNav } from '@/components/global-nav';

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  icons: { icon: "/logo.png?v=4", apple: "/logo.png?v=4" },
  title: "DeenByte Verify",
    description: "Fast, secure and reliable identity verification.",
    };

    export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
      return (
          <html lang="en" suppressHydrationWarning>
<head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.setAttribute('data-theme',localStorage.getItem('db-theme')==='dark'?'dark':'light')}catch(e){}" }} /></head>
                <body className={inter.className}>{children}      <GlobalNav />
    </body>
                    </html>
                      );
                      }
