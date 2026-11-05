"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MailWarning, Loader2, CheckCircle2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommentSettings, formatDurationLabel } from "@/lib/system-settings";

export default function VerificationBanner() {
  const { user, resendVerificationEmail, checkEmailVerificationStatus } = useAuth();
  const { settings: commentSettings } = useCommentSettings();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If user is not logged in, is a local account, registered without email, or their email is already verified, render nothing
  if (!user || user.isLocal || user.isNoEmailAccount || !user.email || user.emailVerified || user.isGoogleUser || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      setEmailSent(true);
      toast({
        title: "Verification Email Sent",
        description: `A new verification link has been sent to ${user.email}.`,
      });
      // Reset the sent state after 30 seconds to allow resending again
      setTimeout(() => setEmailSent(false), 30000);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: "Failed to send verification link. Please try again later.",
      });
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const verified = await checkEmailVerificationStatus();
      if (verified) {
        toast({
          title: "Email Verified!",
          description: "Thank you for verifying your email. You can now access all features.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Still Unverified",
          description: "We couldn't confirm your verification. Please check your inbox or spam folder.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: "An error occurred while checking verification status.",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 text-amber-200 py-3 px-4 backdrop-blur-md sticky top-14 z-40 transition-all duration-300">
      <div className="container max-w-(--breakpoint-5xl) mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs md:text-sm font-medium">
        <div className="flex items-center gap-2.5">
          <MailWarning className="h-5 w-5 text-amber-400 shrink-0" />
          <span>
            Optional: Verify your email (<strong>{user.email}</strong>) for faster comment cooldowns ({formatDurationLabel(commentSettings.cooldownSeconds)} vs {formatDurationLabel(commentSettings.unverifiedCooldownSeconds)}).
          </span>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-center">
          <Button
            size="sm"
            variant="outline"
            disabled={resending || emailSent}
            onClick={handleResend}
            className="h-8 text-xs font-semibold border-amber-500/40 hover:bg-amber-500/20 hover:text-amber-100 bg-transparent text-amber-200"
          >
            {resending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Sending...
              </>
            ) : emailSent ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1.5 text-emerald-400" />
                Link Sent
              </>
            ) : (
              "Resend Link"
            )}
          </Button>

          <Button
            size="sm"
            disabled={checking}
            onClick={handleCheckStatus}
            className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black border-transparent"
          >
            {checking ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Checking...
              </>
            ) : (
              <>
                <RotateCcw className="h-3 w-3 mr-1.5" />
                I've Verified
              </>
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 text-amber-200/70 hover:text-amber-100 hover:bg-amber-500/20"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
