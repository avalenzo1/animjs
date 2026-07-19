"use client";

import type { Metadata } from "next";
import localFont from 'next/font/local';
import { ThemeContext } from "./ThemeContext";
import useTheme from "./UseTheme";
import { useContext, useState } from "react";
import NoSSRWrapper from "./NoSSRWrapper";
import "./globals.css";

const akt = localFont({
  src: './fonts/akt.ttf',
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, setTheme] = useTheme();

  return (
      <ThemeContext.Provider value={{theme, setTheme}}>
        <html
          lang="en"
          className={`${akt.className}`}
          data-theme={theme}
        >
          <body>{children}</body>
        </html>
      </ThemeContext.Provider>
  );
}
