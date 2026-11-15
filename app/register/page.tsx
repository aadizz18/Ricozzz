import { redirect } from "next/navigation";

export default async function RegisterRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; type?: string }>;
}) {
  const params = await searchParams;
  const role = params.role || params.type || "company";
  redirect(`/signup?type=${role === "designer" || role === "talent" ? "talent" : "company"}`);
}
