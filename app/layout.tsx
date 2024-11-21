import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fontFamily = "Katex_Main";

const geistSans = localFont({
  src: "./fonts/cmunrm.ttf",
  variable: "--font-cmu-serif-roman",
  weight: "100 900",
});
const bold = localFont({
  src: "./fonts/cmunbx.ttf",
  variable: "--font-bold",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Mathalogical",
  description: "easy way to write professionaly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
      </head>
      <body
        className={`${geistSans.variable} ${bold.variable} bg-[#f4f4f4] text-gray-700`}
        style={{fontFamily: fontFamily}}
      >
        {children}
      </body>
    </html>
  );
}
