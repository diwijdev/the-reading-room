import { redirect } from "next/navigation";

export default function Home() {
  // For now keep it simple: root always goes to login.
  // We'll upgrade to "smart redirect" later if you want server-side session check.
  redirect("/login");
}