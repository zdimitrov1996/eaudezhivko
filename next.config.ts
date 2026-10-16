import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  async rewrites() {
    // Browsers request /favicon.ico on their own; serve the SVG app icon
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default withNextIntl(nextConfig);
