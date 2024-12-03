// "use client";

// import * as React from "react";
// import { ThemeProvider as NextThemesProvider } from "next-themes";
// import { type ThemeProviderProps } from "next-themes/dist/types";

// export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
// 	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
// }
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Prevent rendering until the client is mounted
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <NextThemesProvider
      defaultTheme="light"
      enableSystem={true}
      attribute="class"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

