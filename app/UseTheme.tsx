"use client";

import { useState, useEffect } from "react";

export default function useTheme() {
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        
        const storedTheme = localStorage.getItem("theme") || "light";
        setTheme(storedTheme);
    }, []);

    useEffect(() => {
        localStorage.setItem("theme", theme);
    }, [theme]);

    return [theme, setTheme] as const;
};