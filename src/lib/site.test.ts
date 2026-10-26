import { describe, expect, it } from "vitest";
import { siteOrigin } from "./site";

describe("site origin", () => {
  it("prefers the public site url, then the Vercel host", () => {
    expect(siteOrigin({ NEXT_PUBLIC_SITE_URL: "https://wonderland.example" }).origin).toBe("https://wonderland.example");
    expect(siteOrigin({ VERCEL_URL: "wonderland-abc.vercel.app" }).origin).toBe("https://wonderland-abc.vercel.app");
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "wonderland.vercel.app", VERCEL_URL: "preview.vercel.app" }).origin).toBe(
      "https://wonderland.vercel.app",
    );
  });

  it("stays on localhost when no host is configured", () => {
    expect(siteOrigin({}).origin).toBe("http://localhost:3000");
    expect(siteOrigin({ NEXT_PUBLIC_SITE_URL: "not a url" }).origin).toBe("http://localhost:3000");
  });
});
