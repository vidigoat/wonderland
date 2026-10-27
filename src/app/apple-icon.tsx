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
          background: "#14110e",
        }}
      >
        <div style={{ width: 92, height: 92, borderRadius: 999, background: "#c4a36a", display: "flex" }} />
        <div style={{ width: 22, height: 22, borderRadius: 999, background: "#efe6d4", marginLeft: 16, display: "flex" }} />
      </div>
    ),
    size,
  );
}
