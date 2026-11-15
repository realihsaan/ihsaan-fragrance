/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: [
    "localhost",
    "localhost:3001",
    "127.0.0.1",
    "127.0.0.1:3001",
    "192.168.0.109",
    "192.168.0.109:3001",
    "192.168.*",
  ],
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/shop.html", destination: "/shop", permanent: true },
      { source: "/product.html", destination: "/product", permanent: true },
      { source: "/cart.html", destination: "/cart", permanent: true },
      { source: "/checkout.html", destination: "/checkout", permanent: true },
      { source: "/wishlist.html", destination: "/wishlist", permanent: true },
      { source: "/account.html", destination: "/account", permanent: true },
      { source: "/order.html", destination: "/order", permanent: true },
      { source: "/track.html", destination: "/track", permanent: true },
      { source: "/story.html", destination: "/story", permanent: true },
      { source: "/contact.html", destination: "/contact", permanent: true },
      { source: "/policies.html", destination: "/policies", permanent: true },
    ];
  },
};

export default nextConfig;
