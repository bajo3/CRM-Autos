import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CRM Automotor",
  description: "CRM SaaS para agencias automotoras argentinas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        <NextTopLoader
          color="#2563eb"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #2563eb, 0 0 5px #2563eb"
        />
        {children}
      </body>
    </html>
  );
}
