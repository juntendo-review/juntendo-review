import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "順天堂大学 授業・研究室口コミサイト",
  description: "順天堂大学の授業や研究室の口コミを投稿・閲覧できる学生向けサイト。授業評価や研究室の雰囲気を共有できます。",
  verification: {
    google: "jbXXxaY4Hngeq4cBrw1DmdKLC26Ut3RVE5Ya6QXoWj4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
