import { cookies } from "next/headers";

export async function getSession() {
  return (await cookies()).get("clinika_session")?.value === "demo";
}

export async function login() {
  "use server";

  (await cookies()).set("clinika_session", "demo", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function logout() {
  "use server";

  (await cookies()).delete("clinika_session");
}
