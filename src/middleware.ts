// import { authMiddleware } from "@clerk/nextjs";

// // See https://clerk.com/docs/references/nextjs/auth-middleware
// // for more information about configuring your Middleware
// export default authMiddleware({
// 	// Allow signed out users to access the specified routes:
// 	// publicRoutes: ["/"],
// });

// export const config = {
// 	matcher: [
// 		// Exclude files with a "." followed by an extension, which are typically static files.
// 		// Exclude files in the _next directory, which are Next.js internals.
// 		"/((?!.+\\.[\\w]+$|_next).*)",
// 		// Re-include any files in the api or trpc folders that might have an extension
// 		"/(api|trpc)(.*)",
// 	],
// };
import { NextRequest, NextResponse } from 'next/server';

// Custom middleware logic
export function middleware(req: NextRequest) {
  // Implement your authentication logic here
  const isAuthenticated = checkAuthentication(req);

  if (!isAuthenticated) {
    return NextResponse.redirect('/login');
  }

  return NextResponse.next();
}

function checkAuthentication(req: NextRequest): boolean {
  // Implement your authentication check logic here
  return true; // Placeholder
}

export const config = {
  matcher: [
    // Exclude files with a "." followed by an extension, which are typically static files.
    // Exclude files in the _next directory, which are Next.js internals.
    "/((?!.+\\.[\\w]+$|_next).*)",
    // Re-include any files in the api or trpc folders that might have an extension
    "/(api|trpc)(.*)",
  ],
};