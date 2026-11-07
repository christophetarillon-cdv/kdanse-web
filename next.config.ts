import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(process.cwd(), "src");
    return config;
  },
  turbopack: {},
  // Dev uniquement : ouvrir `next dev` depuis un téléphone sur le même Wi-Fi
  // (ex. http://192.168.1.17:3000, connexion automatique depuis l'app)
  allowedDevOrigins: ['192.168.*.*'],
};

export default nextConfig;
