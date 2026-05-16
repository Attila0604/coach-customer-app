import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("first_name, telegram_username")
    .eq("user_id", user.id)
    .maybeSingle();

  const firstName = customer?.first_name || "Member";

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="font-serif text-base text-gold mb-12 tracking-wide">
          Coach
        </p>

        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Eingeloggt
        </p>

        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Hallo, {firstName}.
        </h1>

        <p className="text-sm text-bone-muted leading-relaxed mb-8">
          Du bist eingeloggt als{" "}
          <span className="text-bone">@{customer?.telegram_username}</span>.
        </p>

        <p className="text-[11px] text-bone-faint">
          Deine Member-Area kommt in Phase 4. Das hier ist der Login-Test.
        </p>
      </div>
    </main>
  );
}
