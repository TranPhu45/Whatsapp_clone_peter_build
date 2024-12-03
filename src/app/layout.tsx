"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "react-hot-toast";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<html lang="en">
					<body className={inter.className}>
						<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
							{children}
							<Toaster />
						</ThemeProvider>
					</body>
				</html>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}