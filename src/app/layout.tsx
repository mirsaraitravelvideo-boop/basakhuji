import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "বাসাখুঁজি বাংলাদেশ — বাসা ভাড়ার মার্কেটপ্লেস",
  description:
    "বাংলাদেশে বাসা খুঁজুন ও ভাড়া দিন — বাড়িওয়ালা, ভাড়াটিয়া ও প্রশাসকের জন্য নিরাপদ, মোবাইল-ফার্স্ট প্ল্যাটফর্ম।",
  keywords: ["বাসা ভাড়া", "বাড়ি ভাড়া", "বাংলাদেশ", "ফ্ল্যাট ভাড়া", "রুম ভাড়া"],
  appleWebApp: {
    capable: true,
    title: "বাসাখুঁজি",
  },
};

export const viewport: Viewport = {
  themeColor: "#C2703D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
