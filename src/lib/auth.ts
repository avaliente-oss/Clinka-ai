import { cookies } from "next/headers";
import { db } from "./db";

export async function getSessionIdentity() {
  return (await cookies()).get("clinika_session")?.value ?? null;
}

export async function getSession() {
  return Boolean(await getSessionIdentity());
}

export async function login() {
  "use server";

  const user = await db.user.findUniqueOrThrow({ where: { email: "demo@clinika.mx" } });
  (await cookies()).set("clinika_session", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function logout() {
  "use server";

  (await cookies()).delete("clinika_session");
}
