import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Halaman aplikasi membaca sesi dari cookie, jadi tidak ada yang boleh di-cache statis.
  // Setiap route sudah menyatakan `dynamic = "force-dynamic"`; ini hanya menegaskan bahwa
  // build tidak mencoba merender apa pun lebih dulu.
  reactStrictMode: true,
};

export default nextConfig;
