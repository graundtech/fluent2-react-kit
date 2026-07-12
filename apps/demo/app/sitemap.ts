import type { MetadataRoute } from "next";

const SITE_URL = "https://fluent2-react-kit.graund.io";

const COMPONENTS = [
  "accordion",
  "alert",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "card",
  "checkbox",
  "combobox",
  "command",
  "dialog",
  "dropdown-menu",
  "input",
  "label",
  "link",
  "multi-select",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "select",
  "separator",
  "skeleton",
  "spinner",
  "switch",
  "tabs",
  "textarea",
  "toast",
  "tooltip",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const componentPages: MetadataRoute.Sitemap = COMPONENTS.map((component) => ({
    url: `${SITE_URL}/preview/${component}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...componentPages,
  ];
}
