import { Libre_Franklin, Newsreader, Playfair_Display } from "next/font/google";

/** Mastheads and headlines. */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

/** Body copy: leads, captions, decks. */
export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

/** HUD, labels, buttons. */
export const franklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-franklin",
  display: "swap",
});
