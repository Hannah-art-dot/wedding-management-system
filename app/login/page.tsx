import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgb(196_164_132_/_0.22),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgb(154_107_79_/_0.12),_transparent_50%)]"
      />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
