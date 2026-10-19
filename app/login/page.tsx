import { Login } from "@/components/login";
import { configured } from "@/lib/supabase/server";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <Login
      configured={configured()}
      destination={params.next === "chat" ? "/chat" : "/board"}
    />
  );
}
