import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/Geist-Regular.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ГИС ЕГИС НАО",
  description: "Единая геоинформационная система НАО",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bgpage">
        <main>{children}</main>
      </body>
    </html>
  );
}