import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "বাসাখুঁজি বাংলাদেশ",
    short_name: "বাসাখুঁজি",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDF6",
    theme_color: "#0B6B3A",
    lang: "bn",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
