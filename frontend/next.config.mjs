/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

const nextConfig = {
  // Prevent accidental bundling of optional native/HTTP clients
  experimental: {
    serverComponentsExternalPackages: [],
  },
  async rewrites() {
    return [
      // Same-origin proxy → Python FastAPI (avoids CORS / mixed-host issues)
      {
        source: '/backend/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ]
  },
  // Fail loudly if something tries to reintroduce webpack-hostile URL imports
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Dead package — use lib/rag/chromaStore.js REST client instead
      chromadb: false,
    }
    return config
  },
}

export default nextConfig
