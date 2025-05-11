const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if ESLint errors
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig