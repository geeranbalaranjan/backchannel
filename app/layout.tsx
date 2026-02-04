import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backchannel — Live class chat",
  description: "Twitch-style chat for lectures. Join with QR, chat with a pseudonym, upvote and react.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
