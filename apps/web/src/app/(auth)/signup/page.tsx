"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import { Button, Input, Label, Alert, useToast } from "@dcos/ui";
import { useAuth } from "@/lib/auth/provider";
import { isSupabaseConfigured } from "@/lib/auth/config";

export default function SignupPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const devMode = !isSupabaseConfigured();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (phone.length < 10 || name.trim().length < 2) return;
    setLoading(true);
    const res = await requestOtp(phone);
    setLoading(false);
    if (res.ok) {
      setSent(true);
      toast({ variant: "info", title: "OTP sent", description: res.message });
    } else {
      toast({ variant: "error", title: "Could not send OTP", description: res.message });
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await verifyOtp(phone, code);
      toast({ variant: "success", title: "Account created", description: `Welcome, ${name}!` });
      router.push("/file");
    } catch (e) {
      toast({ variant: "error", title: "Verification failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Register with your mobile number to file and track complaints.
        </p>
      </div>

      {devMode && (
        <Alert variant="info" icon={<Info className="h-4 w-4" />}>
          Development mode — enter any 6-digit code to complete signup.
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" required>
            Full name
          </Label>
          <Input
            id="name"
            placeholder="Aarav Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={sent}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" required>
            Mobile number
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={sent}
          />
        </div>

        {sent && (
          <div className="space-y-1.5 animate-fade-in">
            <Label htmlFor="otp" required>
              Verify OTP
            </Label>
            <Input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-lg tracking-[0.4em]"
            />
          </div>
        )}

        {!sent ? (
          <Button
            className="w-full"
            onClick={sendOtp}
            loading={loading}
            disabled={phone.length < 10 || name.trim().length < 2}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="w-full" onClick={verify} loading={loading} disabled={code.length < 4}>
            Create account
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
