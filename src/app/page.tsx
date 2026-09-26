import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roles";
import { getSession } from "@/server/auth/session";

export default async function Home() {
  const session = await getSession();
  redirect(session ? ROLE_HOME[session.user.role] : "/giris");
}
