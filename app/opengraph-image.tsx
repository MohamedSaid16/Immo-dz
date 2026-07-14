import { ImageResponse } from "next/og";

export const alt = "Immo DZ — La plateforme immobilière algérienne";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f766e 0%, #0b3d3a 55%, #0b1120 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 8,
              padding: 22,
            }}
          >
            <div style={{ width: 16, height: 34, background: "#5eead4", borderRadius: 3 }} />
            <div style={{ width: 16, height: 52, background: "#ffffff", borderRadius: 3 }} />
            <div style={{ width: 16, height: 42, background: "#5eead4", borderRadius: 3 }} />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            <span>Immo&nbsp;</span>
            <span style={{ color: "#5eead4" }}>DZ</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          La plateforme immobilière algérienne
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>
          Achat · Vente · Location — dans les 58 wilayas
        </div>
      </div>
    ),
    { ...size },
  );
}
