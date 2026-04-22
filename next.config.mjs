import withBundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Note: It is generally better to fix errors,
    // but keeping this as per your requirement.
    ignoreBuildErrors: true,
    tsconfigPath: "tsconfig.json",
  },
  experimental: {
    // This is excellent for performance; it helps with the
    // script evaluation issues seen in your Lighthouse reports.
    optimizePackageImports: ["lucide-react", "@tabler/icons-react", "recharts"],
  },
};

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer(nextConfig);
