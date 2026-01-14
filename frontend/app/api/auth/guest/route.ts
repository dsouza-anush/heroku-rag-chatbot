import { signIn } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get("redirectUrl") || "/pipelines";

  return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
