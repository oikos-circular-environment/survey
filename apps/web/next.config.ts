import "@survey/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	output: process.env.VERCEL ? undefined : "standalone",
	allowedDevOrigins: ["local-survey.oikos.company"],
};

export default nextConfig;
