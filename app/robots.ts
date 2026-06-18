import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/seminar-dashboard",
          "/team-sales-dashboard",
          "/life-plan-risk-map",
          "/team",
          "/api/seminar-dashboard",
          "/api/team-sales-dashboard",
        ],
      },
    ],
  };
}
