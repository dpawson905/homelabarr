import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["dockerode", "systeminformation"],
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
