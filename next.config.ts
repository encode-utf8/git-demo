import type { NextConfig } from "next";

// 关闭 Next.js 16 自动生成 AGENTS.md/CLAUDE.md 的行为，保持仓库清洁。
const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
