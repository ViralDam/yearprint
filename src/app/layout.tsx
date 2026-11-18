import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AccountButton, AccountButtonFallback } from "@/components/site/account-button";
import { Footer } from "@/components/site/footer";
import { Hud } from "@/components/site/hud";
import { HudProvider } from "@/components/site/hud-context";
import { StreakSlot } from "@/components/streak/streak-slot";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { franklin, newsreader, playfair } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — One paper. No date. Name its year.`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — One paper. No date. Name its year.`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${newsreader.variable} ${franklin.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <HudProvider>
          <Hud
            streak={
              <Suspense fallback={null}>
                <StreakSlot />
              </Suspense>
            }
            account={
              <Suspense fallback={<AccountButtonFallback />}>
                <AccountButton />
              </Suspense>
            }
          />
          <main className="flex-1">{children}</main>
          <Footer />
        </HudProvider>
      </body>
    </html>
  );
}
