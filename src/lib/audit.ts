import { getSessionIdentity } from "./auth";
import { db } from "./db";

export async function getSessionUser() {
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Sesión no válida.");
  // "demo" keeps pre-deployment cookies valid during the rollout.
  return identity === "demo"
    ? db.user.findUniqueOrThrow({ where: { email: "demo@clinika.mx" } })
    : db.user.findUniqueOrThrow({ where: { id: identity } });
}

export async function getSessionUserId() {
  return (await getSessionUser()).id;
}
