import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";

// The site-wide share card: a scrap of newsprint with the date torn off.
// Rendered once at build time.
export const alt = "Yearprint — One paper. No date. Name its year.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Every string on the card, so the font subset covers all its letters.
const CARD_TEXT = [
  "THE DAILY CHRONICLE",
  "YEARPRINT",
  "One paper. No date. Name its year.",
  "DATE OF ISSUE:",
];

/** Playfair Display Black as TTF (ImageResponse can't read WOFF2). */
async function loadPlayfair(): Promise<ArrayBuffer | null> {
  "use cache";
  cacheLife("max");
  try {
    const glyphs = encodeURIComponent([...new Set(CARD_TEXT.join(""))].join(""));
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&text=${glyphs}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((https:[^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null; // Fall back to the built-in font rather than fail the build.
  }
}

export default async function Image() {
  const playfair = await loadPlayfair();
  const display = playfair ? "Playfair" : "sans-serif";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#26211a",
      }}
    >
      <div
        style={{
          width: 1040,
          height: 500,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4ecd4",
          color: "#221c11",
          border: "2px solid #d9cba6",
          transform: "rotate(-1deg)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 8, color: "#4c4433", display: "flex" }}>
          THE DAILY CHRONICLE
        </div>
        <div
          style={{
            fontFamily: display,
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 1,
            marginTop: 18,
            display: "flex",
          }}
        >
          YEAR<span style={{ color: "#a97b1f" }}>PRINT</span>
        </div>
        <div style={{ fontSize: 40, fontStyle: "italic", marginTop: 22, display: "flex" }}>
          One paper. No date. Name its year.
        </div>
        <div
          style={{
            marginTop: 34,
            paddingTop: 14,
            borderTop: "3px solid #2a2417",
            fontSize: 24,
            letterSpacing: 3,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          DATE OF ISSUE:
          <div style={{ width: 150, height: 30, background: "#221c11", display: "flex" }} />
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: playfair ? [{ name: "Playfair", data: playfair, weight: 900, style: "normal" }] : [],
    },
  );
}
