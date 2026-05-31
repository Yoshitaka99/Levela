import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/seminar-dashboard", "/api/seminar-dashboard"],
      },
    ],
  };
}
