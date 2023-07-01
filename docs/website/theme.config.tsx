import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const Logo = () => {
  return (
    <h1 style={{ fontSize: "30px", fontWeight: "bold" }}>📀 Remix-Auth</h1>
  );
};

const config: DocsThemeConfig = {
  logo: Logo,
  project: {
    link: "https://github.com/sergiodxa/remix-auth",
  },
  chat: {
    link: "https://discord.com/invite/xwx7mMzVkA",
  },
  docsRepositoryBase: "https://github.com/sergiodxa/remix-auth",
  footer: {
    text: Logo,
  },
  primaryHue: { dark: 165, light: 220 },
};

export default config;
