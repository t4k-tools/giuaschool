import type { NextConfig } from "next";

// URL del backend Symfony (lato server, mai esposto al browser)
const backendUrl =
  process.env.BACKEND_URL?.replace(/\/+$/, "") || "http://localhost:8080";

const nextConfig: NextConfig = {
  // Produce un output standalone per Docker
  output: "standalone",
  // Permette al dev server di ricevere richieste dall'IP locale e dal dominio
  allowedDevOrigins: ["10.10.40.135", "registro.efor.it"],
  // Proxy server-side: il browser chiama /api/* sullo stesso origin,
  // Next.js gira la richiesta al backend — zero CORS, funziona con Cloudflare Tunnel
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
