export default function robots() {
  const baseUrl = "https://maisonihsaanali.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/courier/", "/api/admin/", "/api/courier/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
