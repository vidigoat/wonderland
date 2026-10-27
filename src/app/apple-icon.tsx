import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <div style={{ width: 104, height: 104, borderRadius: 999, border: "12px solid #fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: "#fafafa", display: "flex" }} />
        </div>
      </div>
    ),
    size,
  );
}
