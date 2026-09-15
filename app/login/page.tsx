import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col overflow-hidden">
      {/* Full-screen photo — max quality, cover without stretch/pixelation */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/images/indoor_standing.jpg"
          alt=""
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 z-[1] bg-black/15" aria-hidden />

      <div className="relative z-10 flex min-h-dvh w-full flex-col">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
