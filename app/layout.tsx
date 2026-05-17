import type { Metadata } from "next";
import { Geist_Mono, JetBrains_Mono, Fira_Code, Antonio, Rajdhani, Audiowide } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { THEMES } from "@/lib/themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

// LCARS theme — closest free analog to Eurostile Bold Extended
const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-antonio",
  display: "swap",
});

// Tron Legacy theme — geometric condensed sans, closest free analog to TR2N
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

// Tron Classic theme — 80s arcade/CRT display, closest free analog to the original Tron title face
const audiowide = Audiowide({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-audiowide",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Homelabarr",
  description: "Self-hosted homelab dashboard",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${firaCode.variable} ${antonio.variable} ${rajdhani.variable} ${audiowide.variable}`} suppressHydrationWarning>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dracula"
          themes={[...THEMES.map((t) => t.id), "system"]}
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
