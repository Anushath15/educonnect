/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_URL || 'http://localhost:3000'}/api/v1/:path*` }]
  }
}
module.exports = nextConfig
