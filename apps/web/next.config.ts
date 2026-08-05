import "@survey/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	output: "standalone",
	allowedDevOrigins: ["local-survey.oikos.company"],
};

export default nextConfig;
