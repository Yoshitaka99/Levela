import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/seminar-dashboard",
          "/team-sales-dashboard",
          "/team",
          "/api/seminar-dashboard",
          "/api/team-sales-dashboard",
        ],
      },
    ],
  };
}
