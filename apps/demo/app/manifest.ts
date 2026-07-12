import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fluent 2 React Kit",
    short_name: "Fluent 2 Kit",
    description:
      "Accessible Fluent 2-inspired React components distributed through npm and a shadcn registry.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#817cf5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
