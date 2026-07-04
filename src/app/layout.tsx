import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relu Company Intelligence Assistant",
  description: "AI-Powered Research Assistant for Company Intelligence, Competitor Analysis, and Automated Reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
