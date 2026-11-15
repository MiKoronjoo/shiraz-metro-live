import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shiraz Metro Live",
    short_name: "Shiraz Metro",
    description: "Estimated live Shiraz metro train positions based on published timetables.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#e53935",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
