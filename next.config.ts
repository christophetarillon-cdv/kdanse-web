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
  // espace.perso.stagededanse.net : raccourci vers l'espace perso sur l'adresse
  // principale (une seule adresse = une seule session de connexion Firebase)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'espace.perso.stagededanse.net' }],
        destination: 'https://inscription.stagededanse.net/dashboard',
        permanent: false,
      },
      // L'accueil du site de réservation est la liste des stages
      {
        source: '/',
        destination: '/stages',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
