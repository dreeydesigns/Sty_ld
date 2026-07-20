declare module "next-pwa" {
  const withPWA: (config: unknown) => (nextConfig: unknown) => unknown;
  export default withPWA;
}
