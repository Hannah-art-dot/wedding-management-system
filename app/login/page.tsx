import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main
      className="relative flex h-screen w-screen flex-col overflow-hidden before:absolute before:inset-0 before:z-[1] before:bg-black/45 before:content-['']"
      style={{
        backgroundImage: "url('/images/wedding-hero.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
