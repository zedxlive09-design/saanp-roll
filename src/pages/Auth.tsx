import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowRight, Loader2, Mail, UserX, ShieldCheck, ArrowLeft } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Game sign-in screen — full-bleed felt-green table, big gold logo title at
 * top, centered translucent auth card. Two-step email → OTP flow preserved
 * exactly. Guest login preserved. redirectAfterAuth prop preserved.
 */
interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);

      console.log("signed in");

      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);

      setError("The verification code you entered is incorrect.");
      setIsLoading(false);

      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting anonymous sign in...");
      await signIn("anonymous");
      console.log("Anonymous sign in successful");
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        // Deep felt-green table gradient — matches Landing/Home/GamePlay
        background:
          "radial-gradient(ellipse at 50% 35%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
      }}
    >
      {/* Warm spotlight overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 28%, oklch(1 0.02 80 / 0.14) 0%, transparent 55%)",
        }}
      />
      {/* Vignette for depth */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.55)" }}
      />

      {/* Back button top-left (translucent game icon) */}
      <button
        onClick={() => navigate("/")}
        aria-label="Back"
        className="absolute left-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white safe-top"
      >
        <ArrowLeft className="size-5" />
      </button>

      {/* Centered content */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-4 py-10 safe-top safe-bottom">
        {/* Logo / title block */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-7 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-5xl font-bold leading-[0.9] tracking-tight sm:text-6xl"
            style={{
              backgroundImage:
                "linear-gradient(180deg, oklch(0.92 0.14 75) 0%, oklch(0.74 0.16 70) 55%, oklch(0.55 0.13 60) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 4px 24px oklch(0 0 0 / 0.45)",
            }}
          >
            Saanp Seedhi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-2 font-display text-xs uppercase tracking-[0.4em] text-white/55"
          >
            Heritage Edition
          </motion.p>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-sm rounded-3xl border border-white/15 bg-black/30 p-6 shadow-[0_14px_40px_oklch(0_0_0/0.5)] backdrop-blur-md"
        >
          <AnimatePresence mode="wait">
            {step === "signIn" ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-4 flex items-center justify-center gap-2 text-white/95">
                  <ShieldCheck className="size-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Get Started</h2>
                </div>
                <p className="mb-5 text-center text-xs text-white/55">
                  Enter your email to log in or sign up
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {/* Email input — translucent game field */}
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                    <Input
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      disabled={isLoading}
                      required
                      className="h-12 border-white/15 bg-white/5 pl-10 text-white placeholder:text-white/35 backdrop-blur-sm focus:border-primary/60 focus-visible:border-primary/60"
                    />
                  </div>

                  {/* Error notification (game-styled) */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Continue button — chunky primary gold */}
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-gradient-to-b from-primary to-primary/70 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[0_5px_0_0_oklch(0.5_0.12_55),0_10px_24px_oklch(0_0_0/0.5)] transition-all hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55),0_8px_20px_oklch(0_0_0/0.55)] active:translate-y-1 active:shadow-[0_3px_0_0_oklch(0.5_0.12_55)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-[0_5px_0_0_oklch(0.5_0.12_55),0_10px_24px_oklch(0_0_0/0.5)]"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Guest button — chunky secondary teal */}
                <motion.button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-secondary/50 bg-gradient-to-b from-secondary to-secondary/70 text-sm font-bold uppercase tracking-wider text-secondary-foreground shadow-[0_5px_0_0_oklch(0.3_0.04_190),0_10px_24px_oklch(0_0_0/0.45)] transition-all hover:shadow-[0_4px_0_0_oklch(0.3_0.04_190),0_8px_20px_oklch(0_0_0/0.5)] active:translate-y-1 active:shadow-[0_3px_0_0_oklch(0.3_0.04_190)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-[0_5px_0_0_oklch(0.3_0.04_190),0_10px_24px_oklch(0_0_0/0.45)]"
                >
                  <UserX className="size-4" />
                  Continue as Guest
                </motion.button>

                <p className="mt-5 text-center text-[10px] text-white/35">
                  Secured by{" "}
                  <a
                    href="https://freebuff.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/70 underline transition-colors hover:text-primary"
                  >
                    freebuff.com
                  </a>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-4 flex items-center justify-center gap-2 text-white/95">
                  <Mail className="size-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Check your email</h2>
                </div>
                <p className="mb-6 text-center text-xs text-white/55">
                  We've sent a code to{" "}
                  <span className="font-medium text-white/80">{step.email}</span>
                </p>

                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />

                  {/* OTP input — translucent game-styled slots */}
                  <div
                    className="flex justify-center [&_[data-slot='input-otp-slot']]:!h-12 [&_[data-slot='input-otp-slot']]:!w-10 [&_[data-slot='input-otp-slot']]:!border-white/20 [&_[data-slot='input-otp-slot']]:!bg-white/10 [&_[data-slot='input-otp-slot']]:!text-lg [&_[data-slot='input-otp-slot']]:!text-white [&_[data-slot='input-otp-slot']]:!backdrop-blur-sm"
                  >
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          // Find the closest form and submit it
                          const form = (e.target as HTMLElement).closest("form");
                          if (form) {
                            form.requestSubmit();
                          }
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {/* Error notification */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-center text-xs font-medium text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Verify button — chunky primary gold */}
                  <motion.button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-gradient-to-b from-primary to-primary/70 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[0_5px_0_0_oklch(0.5_0.12_55),0_10px_24px_oklch(0_0_0/0.5)] transition-all hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55),0_8px_20px_oklch(0_0_0/0.55)] active:translate-y-1 active:shadow-[0_3px_0_0_oklch(0.5_0.12_55)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-[0_5px_0_0_oklch(0.5_0.12_55),0_10px_24px_oklch(0_0_0/0.5)]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify code
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </motion.button>

                  {/* Secondary action — translucent game button */}
                  <button
                    type="button"
                    onClick={() => setStep("signIn")}
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-white/65 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/90 disabled:opacity-50"
                  >
                    Use different email
                  </button>
                </form>

                <p className="mt-4 text-center text-xs text-white/50">
                  Didn't receive a code?{" "}
                  <button
                    type="button"
                    onClick={() => setStep("signIn")}
                    className="font-semibold text-primary/80 underline transition-colors hover:text-primary"
                  >
                    Try again
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
