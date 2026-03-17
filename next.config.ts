import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/garden/garden", destination: "/garden/insights", permanent: true },
      { source: "/garden/topics", destination: "/garden/journal", permanent: true },
      { source: "/garden/people", destination: "/garden/mirror", permanent: true },
      { source: "/garden/tasks", destination: "/garden/chat", permanent: true },
    ];
  },
};

export default nextConfig;
