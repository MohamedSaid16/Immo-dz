import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { isTrustedPropertyPhotoUrl } from "@/lib/site-url";

export const runtime = "edge";

function bounded(value: string | null, fallback: string, max: number): string {
  return (value || fallback).trim().slice(0, max);
}

function safeImageUrl(value: string | null): string {
  return value && isTrustedPropertyPhotoUrl(value) ? value : "";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = bounded(searchParams.get("title"), "عقار جديد", 120);
    const price = bounded(searchParams.get("price"), "", 48);
    const wilaya = bounded(searchParams.get("wilaya"), "", 80);
    const type = bounded(searchParams.get("type"), "", 80);
    const image = safeImageUrl(searchParams.get("image"));

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0b1120",
            fontFamily: "sans-serif",
            color: "white",
          }}
        >
          {/* Main Photo */}
          <div
            style={{
              display: "flex",
              height: "65%",
              width: "100%",
              backgroundColor: "#1e293b",
              ...(image ? { backgroundImage: `url(${image})` } : {}),
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {/* Details Bar */}
          <div
            style={{
              display: "flex",
              height: "35%",
              width: "100%",
              padding: "40px",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "4px solid #5eead4",
            }}
            dir="rtl"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "70%" }}>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#94a3b8" }}>
                {type && (
                  <span style={{ fontSize: 28, padding: "4px 16px", borderRadius: "20px", border: "2px solid #334155" }}>
                    {type}
                  </span>
                )}
                {wilaya && <span style={{ fontSize: 28 }}>{wilaya}</span>}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "center",
                width: "30%",
              }}
            >
              <div style={{ fontSize: 42, fontWeight: 900, color: "#5eead4" }}>
                {price}
              </div>
            </div>
          </div>

          {/* Branding overlay */}
          <div
            style={{
              position: "absolute",
              top: 30,
              right: 30,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(15, 23, 42, 0.8)",
              padding: "12px 24px",
              borderRadius: "16px",
              backdropFilter: "blur(10px)",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800 }}>Immo</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#5eead4" }}>DZ</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    void error;
    console.error("[og:property]", { code: "generation-failed" });
    return new Response("Failed to generate image", { status: 500 });
  }
}
