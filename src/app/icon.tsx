import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        <div style={{ width: 18, height: 18, borderRadius: 999, background: "#c4a36a", display: "flex" }} />
        <div style={{ width: 5, height: 5, borderRadius: 999, background: "#efe6d4", marginLeft: 3, display: "flex" }} />
      </div>
    ),
    size,
  );
}
