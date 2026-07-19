"use client";

import { createContext, PropsWithChildren, useContext, useState } from "react";

export const ThemeContext = createContext({
    theme: "light",
    setTheme: (p0: (prev: string) => "light" | "dark") => {}
});