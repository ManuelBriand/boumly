import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Boumly — La boutique des créateurs";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FF4D6D",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 36,
            background: "#ffffff",
            color: "#FF4D6D",
            fontSize: 88,
            fontWeight: 800,
            marginBottom: 40,
          }}
        >
          B
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, color: "#ffffff", letterSpacing: -2 }}>
          Boumly
        </div>
        <div style={{ fontSize: 40, color: "rgba(255,255,255,0.9)", marginTop: 16 }}>
          La boutique des créateurs
        </div>
      </div>
    ),
    { ...size }
  );
}
