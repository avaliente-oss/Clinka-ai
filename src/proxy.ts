import{NextResponse}from"next/server";import type{NextRequest}from"next/server";
export function proxy(req:NextRequest){if(req.nextUrl.pathname==="/login"||req.nextUrl.pathname.startsWith("/_next")||req.nextUrl.pathname.startsWith("/api"))return NextResponse.next();if(req.cookies.get("clinika_session")?.value!=="demo")return NextResponse.redirect(new URL("/login",req.url));return NextResponse.next()}
export const config={matcher:["/((?!favicon.ico).*)"]};
