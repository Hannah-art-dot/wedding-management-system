import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col overflow-x-hidden">
      {/* Full-bleed background — cover + center keeps subjects framed without stretch */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/indoor_standing.jpg')" }}
        aria-hidden
      />
      <div className="absolute inset-0 z-[1] bg-black/15" aria-hidden />

      <div className="relative z-10 flex min-h-dvh w-full flex-col">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
