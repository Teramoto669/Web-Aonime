"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ReCaptcha, IS_RECAPTCHA_ENABLED } from "@/components/auth/ReCaptcha";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ShieldCheck, ArrowLeft, CheckCircle2, HardDrive, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Form validation schemas
const loginSchema = z.object({
  email: z.string().min(3, { message: "Please enter your username or email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  email: z.string().min(3, { message: "Must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function AuthModal() {
  const { user, isAuthModalOpen, authModalTab, closeAuthModal, openAuthModal, login, register, signInWithGoogle, loginAsLocal, resetPassword } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [registerWithoutEmail, setRegisterWithoutEmail] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sentResetEmail, setSentResetEmail] = useState("");

  // Login Form Hook
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Register Form Hook
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    reset: resetRegisterForm,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  // Forgot Password Form Hook
  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
    reset: resetForgotForm,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // Helper to verify reCAPTCHA token with backend API
  const verifyRecaptchaToken = async (token: string, action?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          variant: "destructive",
          title: "CAPTCHA Verification Failed",
          description: data.error || "Failed to verify reCAPTCHA token with server. Please try again.",
        });
        return false;
      }
      return true;
    } catch (err) {
      console.error("reCAPTCHA Verification error:", err);
      toast({
        variant: "destructive",
        title: "CAPTCHA Verification Error",
        description: "An error occurred while verifying CAPTCHA with server.",
      });
      return false;
    }
  };

  // Submit Login
  const onLogin = async (data: LoginFormValues) => {
    if (IS_RECAPTCHA_ENABLED) {
      if (!recaptchaToken) {
        toast({
          variant: "destructive",
          title: "CAPTCHA Verification Required",
          description: "Please complete the reCAPTCHA verification.",
        });
        return;
      }

      setIsSubmitting(true);
      const isVerified = await verifyRecaptchaToken(recaptchaToken, "login");
      if (!isVerified) {
        setRecaptchaToken(null);
        setIsSubmitting(false);
        return;
      }
    } else {
      setIsSubmitting(true);
    }

    try {
      await login(data.email, data.password, rememberMe);
      toast({
        title: "Login Successful",
        description: "Welcome back to Aonime!",
      });
      closeAuthModal();
      resetLoginForm();
      setRecaptchaToken(null);
    } catch (error: any) {
      console.error(error);
      let desc = "Please check your username/email and password.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        desc = "Incorrect username/email or password.";
      } else if (error.code === "auth/firebase-app-check-token-is-invalid" || error?.message?.includes("app-check")) {
        desc = "Firebase App Check verification failed. Please check your App Check and reCAPTCHA settings in Firebase Console.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: desc,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Register
  const onRegister = async (data: RegisterFormValues) => {
    if (honeypot) {
      toast({
        variant: "destructive",
        title: "Registration Blocked",
        description: "Automated spam submission detected.",
      });
      return;
    }
    if (!registerWithoutEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address, or switch to 'Without Email'.",
      });
      return;
    }
    if (registerWithoutEmail && data.email.trim().replace(/[^a-zA-Z0-9_.-]/g, "").length < 3) {
      toast({
        variant: "destructive",
        title: "Invalid Username",
        description: "Username must contain at least 3 valid characters (letters, numbers, _, ., -).",
      });
      return;
    }
    if (IS_RECAPTCHA_ENABLED) {
      if (!recaptchaToken) {
        toast({
          variant: "destructive",
          title: "CAPTCHA Verification Required",
          description: "Please complete the reCAPTCHA verification.",
        });
        return;
      }

      setIsSubmitting(true);
      const isVerified = await verifyRecaptchaToken(recaptchaToken, "signup");
      if (!isVerified) {
        setRecaptchaToken(null);
        setIsSubmitting(false);
        return;
      }
    } else {
      setIsSubmitting(true);
    }

    try {
      await register(data.email, data.password, { withoutEmail: registerWithoutEmail });
      toast({
        title: "Registration Successful",
        description: user?.isLocal
          ? "Account created! Your local Library & Watch History have been transferred."
          : registerWithoutEmail
            ? "Account created without email! You can now use all features."
            : "Account created! Check your inbox to verify your email for faster comment cooldowns.",
      });
      closeAuthModal();
      resetRegisterForm();
      setRecaptchaToken(null);
    } catch (error: any) {
      console.error(error);
      let desc = "Failed to create account. Please try again.";
      if (error.code === "auth/signup-rate-limited") {
        desc = error.message || "Too many accounts created recently. Please wait before trying again.";
      } else if (error.code === "auth/username-already-in-use") {
        desc = "Username is already taken. Please choose another username.";
      } else if (error.code === "auth/invalid-username") {
        desc = error.message || "Invalid username.";
      } else if (error.code === "auth/email-already-in-use") {
        desc = registerWithoutEmail
          ? "Username is already taken. Please choose another username."
          : "Email is already in use. Please use another email.";
      } else if (error.code === "auth/invalid-email") {
        desc = "Invalid format.";
      } else if (error.code === "auth/weak-password") {
        desc = "Password is too weak.";
      }
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: desc,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Google Login
  const onGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Login Successful",
        description: "Welcome to Aonime!",
      });
      closeAuthModal();
      setRecaptchaToken(null);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Failed to sign in with Google. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Forgot Password
  const onForgotPassword = async (data: ForgotPasswordFormValues) => {
    if (IS_RECAPTCHA_ENABLED) {
      if (!recaptchaToken) {
        toast({
          variant: "destructive",
          title: "CAPTCHA Verification Required",
          description: "Please complete the reCAPTCHA verification.",
        });
        return;
      }

      setIsSubmitting(true);
      const isVerified = await verifyRecaptchaToken(recaptchaToken, "forgot_password");
      if (!isVerified) {
        setRecaptchaToken(null);
        setIsSubmitting(false);
        return;
      }
    } else {
      setIsSubmitting(true);
    }

    try {
      await resetPassword(data.email);
      setSentResetEmail(data.email);
      setResetEmailSent(true);
      toast({
        title: "Reset Link Sent",
        description: `A password reset link has been sent to ${data.email}.`,
      });
      setRecaptchaToken(null);
    } catch (error: any) {
      console.error("Forgot password error:", error);
      let desc = "Failed to send password reset email. Please try again.";
      if (error.code === "auth/user-not-found") {
        desc = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        desc = "Invalid email format.";
      } else if (error.code === "auth/too-many-requests") {
        desc = "Too many requests. Please wait a few minutes before trying again.";
      }
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: desc,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (val: string) => {
    setRecaptchaToken(null);
    setResetEmailSent(false);
    openAuthModal(val as 'login' | 'register' | 'forgot-password');
  };

  return (
    <Dialog
      open={isAuthModalOpen}
      onOpenChange={(open) => {
        if (!open) {
          setResetEmailSent(false);
          resetForgotForm();
          closeAuthModal();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[420px] bg-background/95 border-border/80 backdrop-blur-md rounded-xl shadow-2xl p-6"
        onFocusOutside={(e) => {
          // Prevent Radix FocusScope from trapping focus away from reCAPTCHA challenge popup
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Prevent dialog from closing or intercepting events when clicking reCAPTCHA challenge iframe outside the dialog
          const target = e.target as HTMLElement | null;
          if (
            target?.closest?.('iframe') ||
            target?.closest?.('div[style*="2000000000"]') ||
            (target?.tagName && target.tagName.toLowerCase() === 'iframe')
          ) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="space-y-1">
          {authModalTab === "forgot-password" ? (
            <>
              <div className="flex items-center justify-between w-full mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmailSent(false);
                    openAuthModal("login");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sign In</span>
                </button>
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-center text-primary">
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {resetEmailSent
                  ? "We've sent a recovery link to your inbox."
                  : "Enter your registered email and we'll send you a password reset link."}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="text-2xl font-black tracking-tight text-center text-primary">
                Aonime Account
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                Access your favorite anime library and sync your progress.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {authModalTab === "forgot-password" ? (
          resetEmailSent ? (
            <div className="space-y-4 py-4 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  Check Your Email
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We sent a password reset link to{" "}
                  <span className="font-semibold text-foreground">{sentResetEmail}</span>.
                  Please check your inbox and spam folder.
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  onClick={() => {
                    setResetEmailSent(false);
                    resetForgotForm();
                    openAuthModal("login");
                  }}
                  className="w-full font-bold"
                >
                  Back to Sign In
                </Button>
                <button
                  type="button"
                  onClick={() => setResetEmailSent(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold underline underline-offset-4 transition-colors"
                >
                  Didn't receive email? Try again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit(onForgotPassword)} className="space-y-4 mt-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Account Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="name@email.com"
                    className="pl-9 bg-muted/20 border-border/80 focus-visible:ring-primary"
                    disabled={isSubmitting}
                    {...registerForgot("email")}
                  />
                </div>
                {forgotErrors.email && (
                  <p className="text-xs text-destructive font-medium mt-1">{forgotErrors.email.message}</p>
                )}
              </div>

              {IS_RECAPTCHA_ENABLED && (
                <ReCaptcha
                  action="forgot_password"
                  onVerify={(token) => setRecaptchaToken(token)}
                  onExpire={() => setRecaptchaToken(null)}
                />
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Password Reset Link"
                )}
              </Button>
            </form>
          )
        ) : (
          <Tabs value={authModalTab} onValueChange={handleTabChange} className="w-full mt-4">
            {user?.isLocal && (
              <div className="mb-3 p-2.5 rounded-lg bg-primary/10 border border-primary/25 text-xs text-foreground flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Your <strong>Local Library &amp; Watch History</strong> will automatically transfer when you create an account or sign in.
                </span>
              </div>
            )}
            <TabsList className="grid w-full grid-cols-2 bg-muted/80 p-1 rounded-lg">
              <TabsTrigger value="login" disabled={isSubmitting} className="rounded-md font-semibold text-sm">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" disabled={isSubmitting} className="rounded-md font-semibold text-sm">
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Login Content */}
            <TabsContent value="login" className="mt-4 space-y-4">
              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Username or Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="text"
                      placeholder="username or name@email.com"
                      className="pl-9 bg-muted/20 border-border/80 focus-visible:ring-primary"
                      disabled={isSubmitting}
                      {...registerLogin("email")}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-xs text-destructive font-medium mt-1">{loginErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9 bg-muted/20 border-border/80 focus-visible:ring-primary"
                      disabled={isSubmitting}
                      {...registerLogin("password")}
                    />
                  </div>
                  {loginErrors.password && (
                    <p className="text-xs text-destructive font-medium mt-1">{loginErrors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(!!checked)}
                      disabled={isSubmitting}
                    />
                    <Label
                      htmlFor="remember-me"
                      className="text-xs font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground"
                    >
                      Remember me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmailSent(false);
                      openAuthModal("forgot-password");
                    }}
                    className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

              {IS_RECAPTCHA_ENABLED && (
                <ReCaptcha
                  action="login"
                  onVerify={(token) => setRecaptchaToken(token)}
                  onExpire={() => setRecaptchaToken(null)}
                />
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Sign In to Account"
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Register Content */}
          <TabsContent value="register" className="mt-4 space-y-4">
            <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-4">
              {/* Honeypot anti-bot field */}
              <input
                type="text"
                name="website_url"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/50 border border-border/50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRegisterWithoutEmail(true)}
                  className={cn(
                    "py-1.5 px-2 rounded-md text-xs font-bold transition-all",
                    registerWithoutEmail
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Without Email
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterWithoutEmail(false)}
                  className={cn(
                    "py-1.5 px-2 rounded-md text-xs font-bold transition-all",
                    !registerWithoutEmail
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  With Email
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">
                  {registerWithoutEmail ? "Username" : "Email"}
                </Label>
                <div className="relative">
                  {registerWithoutEmail ? (
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    id="register-email"
                    type={registerWithoutEmail ? "text" : "email"}
                    placeholder={registerWithoutEmail ? "your_username" : "name@email.com"}
                    className="pl-9 bg-muted/20 border-border/80 focus-visible:ring-primary"
                    disabled={isSubmitting}
                    {...registerRegister("email")}
                  />
                </div>
                {registerErrors.email && (
                  <p className="text-xs text-destructive font-medium mt-1">{registerErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="At least 6 characters"
                    className="pl-9 bg-muted/20 border-border/80 focus-visible:ring-primary"
                    disabled={isSubmitting}
                    {...registerRegister("password")}
                  />
                </div>
                {registerErrors.password && (
                  <p className="text-xs text-destructive font-medium mt-1">{registerErrors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    className="pl-9 bg-muted/20 border-border/80 focus-visible:ring-primary"
                    disabled={isSubmitting}
                    {...registerRegister("confirmPassword")}
                  />
                </div>
                {registerErrors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium mt-1">{registerErrors.confirmPassword.message}</p>
                )}
              </div>

              {IS_RECAPTCHA_ENABLED && (
                <ReCaptcha
                  action="signup"
                  onVerify={(token) => setRecaptchaToken(token)}
                  onExpire={() => setRecaptchaToken(null)}
                />
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create New Account"
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Social Sign In Divider & Button */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="w-full border-border/80 hover:bg-muted/50 font-bold flex items-center justify-center gap-2"
            onClick={onGoogleSignIn}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Sign In with Google
          </Button>

          {!user?.isLocal && (
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              className="w-full mt-2 font-bold flex items-center justify-center gap-2 text-xs h-9 bg-muted/60 hover:bg-muted border border-border/60"
              onClick={() => {
                loginAsLocal();
                toast({
                  title: "Local Account Active",
                  description: "You can now use Library & Watch History on this device. Create an account anytime to transfer your data!",
                });
                closeAuthModal();
              }}
            >
              <HardDrive className="h-3.5 w-3.5 text-primary" />
              Use Local Account (Library &amp; History Only)
            </Button>
          )}
        </Tabs>
      )}
    </DialogContent>
  </Dialog>
);
}
