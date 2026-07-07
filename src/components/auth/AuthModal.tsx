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
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ShieldCheck } from "lucide-react";

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthModal() {
  const { isAuthModalOpen, authModalTab, closeAuthModal, openAuthModal, login, register, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Submit Login
  const onLogin = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast({
        title: "Login Successful",
        description: "Welcome back to Aonime!",
      });
      closeAuthModal();
      resetLoginForm();
    } catch (error: any) {
      console.error(error);
      let desc = "Please check your email and password.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        desc = "Incorrect email or password.";
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
    setIsSubmitting(true);
    try {
      await register(data.email, data.password);
      toast({
        title: "Registration Successful",
        description: "Your account has been created successfully!",
      });
      closeAuthModal();
      resetRegisterForm();
    } catch (error: any) {
      console.error(error);
      let desc = "Failed to create account. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        desc = "Email is already in use. Please use another email.";
      } else if (error.code === "auth/invalid-email") {
        desc = "Invalid email format.";
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

  const handleTabChange = (val: string) => {
    openAuthModal(val as 'login' | 'register');
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-[420px] bg-background/95 border-border/80 backdrop-blur-md rounded-xl shadow-2xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-black tracking-tight text-center text-primary">
            Aonime Account
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Access your favorite anime library and sync your progress.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authModalTab} onValueChange={handleTabChange} className="w-full mt-4">
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
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="name@email.com"
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
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="name@email.com"
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
