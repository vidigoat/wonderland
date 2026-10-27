import { ImageResponse } from "next/og";
import { markDataUrl } from "@/components/brand/mark-data";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        { }
        <img src={markDataUrl()} width={132} height={132} alt="" />
      </div>
    ),
    size,
  );
}
