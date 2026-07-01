/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    return [
      // /api/auth/login   → http://localhost:3000/v1/auth/login
      // /api/staff        → http://localhost:3000/v1/staff
      // /api/school/stats → http://localhost:3000/v1/school/stats
      { source: '/api/:path*', destination: `${apiUrl}/v1/:path*` },
    ]
  },
}
module.exports = nextConfig