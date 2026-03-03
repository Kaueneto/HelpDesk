import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações para produção
   output: "standalone",
  
  // Configurações de produção para rede
  experimental: {
    // Permite acesso via IP da rede
    //allowMiddlewareResponseBody: true,
  },
  
  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
