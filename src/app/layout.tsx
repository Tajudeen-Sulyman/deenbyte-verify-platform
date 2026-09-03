import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  icons: { icon: "/logo.jpg?v=2", apple: "/logo.jpg?v=2" },
  title: "DeenByte Verify",
    description: "Fast, secure and reliable identity verification.",
    };

    export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
      return (
          <html lang="en">
                <body className={inter.className}>{children}</body>
                    </html>
                      );
                      }
