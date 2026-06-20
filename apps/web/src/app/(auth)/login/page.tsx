"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Phone, Mail, ArrowRight, Info } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  useToast,
} from "@dcos/ui";
import { useAuth } from "@/lib/auth/provider";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { homeForRole } from "@/lib/auth/types";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { requestOtp, verifyOtp, loginPassword } = useAuth();
  const { toast } = useToast();
  const params = useSearchParams();
  const next = params.get("next");

  const devMode = !isSupabaseConfigured();

  // Hard navigation so the Supabase session cookie reaches the Next middleware
  // before the protected route is requested (avoids a guard bounce-back).
  const redirect = (role: Parameters<typeof homeForRole>[0]) => {
    window.location.assign(next || homeForRole(role));
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to file, track, or manage civic grievances.
        </p>
      </div>

      {devMode && (
        <Alert variant="info" icon={<Info className="h-4 w-4" />}>
          Development mode — Supabase isn&apos;t configured, so any phone/email works and
          OTP isn&apos;t actually sent.
        </Alert>
      )}

      <Tabs defaultValue="citizen">
        <TabsList className="w-full">
          <TabsTrigger value="citizen" className="flex-1">
            <Phone className="h-4 w-4" /> Citizen
          </TabsTrigger>
          <TabsTrigger value="officer" className="flex-1">
            <Mail className="h-4 w-4" /> Officer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="citizen">
          <CitizenLogin
            onRequestOtp={requestOtp}
            onVerify={verifyOtp}
            onSuccess={() => redirect("citizen")}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="officer">
          <OfficerLogin
            onLogin={loginPassword}
            onSuccess={(role) => redirect(role)}
            toast={toast}
            devMode={devMode}
          />
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        New citizen?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

type Toast = ReturnType<typeof useToast>["toast"];

function CitizenLogin({
  onRequestOtp,
  onVerify,
  onSuccess,
  toast,
}: {
  onRequestOtp: (phone: string) => Promise<{ ok: boolean; message: string }>;
  onVerify: (phone: string, code: string) => Promise<unknown>;
  onSuccess: () => void;
  toast: Toast;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    const res = await onRequestOtp(phone);
    setLoading(false);
    if (res.ok) {
      setSent(true);
      toast({ variant: "info", title: "OTP", description: res.message });
    } else {
      toast({ variant: "error", title: "Could not send OTP", description: res.message });
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await onVerify(phone, code);
      toast({ variant: "success", title: "Signed in" });
      onSuccess();
    } catch (e) {
      toast({ variant: "error", title: "Verification failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
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
            Enter 6-digit OTP
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
        <Button className="w-full" onClick={sendOtp} loading={loading} disabled={phone.length < 10}>
          Send OTP <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button className="w-full" onClick={verify} loading={loading} disabled={code.length < 4}>
          Verify & sign in
        </Button>
      )}
    </div>
  );
}

function OfficerLogin({
  onLogin,
  onSuccess,
  toast,
  devMode,
}: {
  onLogin: (email: string, password: string) => Promise<{ role: Parameters<typeof homeForRole>[0] }>;
  onSuccess: (role: Parameters<typeof homeForRole>[0]) => void;
  toast: Toast;
  devMode: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const user = await onLogin(email, password);
      toast({ variant: "success", title: "Signed in" });
      onSuccess(user.role);
    } catch (e) {
      toast({ variant: "error", title: "Login failed", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="email" required>
          Official email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="officer@delhi.gov.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password" required>
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>
      {devMode && (
        <p className="text-2xs text-muted-foreground">
          Dev tip: email starting with <code className="rounded bg-muted px-1">cm</code> → Command
          Center, <code className="rounded bg-muted px-1">admin</code> → Dept Admin, else Field
          Officer.
        </p>
      )}
      <Button className="w-full" onClick={submit} loading={loading} disabled={!email || !password}>
        Sign in <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
