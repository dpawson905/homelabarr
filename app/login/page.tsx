"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  EyeIcon,
  ViewOffIcon,
  LockPasswordIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type AuthState = "loading" | "login" | "setup";

function PasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      <HugeiconsIcon
        icon={visible ? ViewOffIcon : EyeIcon}
        className="size-3.5"
        strokeWidth={1.5}
      />
    </button>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        minLength={8}
        className="pr-8"
      />
      <PasswordToggle visible={visible} onToggle={() => setVisible(!visible)} />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();

        if (data.authenticated) {
          router.push("/");
          return;
        }

        setAuthState(data.setupRequired ? "setup" : "login");
      } catch {
        setAuthState("login");
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }

      router.push("/");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Homelabarr
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Self-hosted homelab dashboard
          </p>
        </div>

        {authState === "loading" && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-5 animate-spin text-muted-foreground"
                strokeWidth={2}
              />
            </CardContent>
          </Card>
        )}

        {authState === "login" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={LockPasswordIcon}
                  className="size-4 text-primary"
                  strokeWidth={1.5}
                />
                <CardTitle>Welcome back</CardTitle>
              </div>
              <CardDescription>Enter your password to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="remember-me"
                    className="cursor-pointer text-muted-foreground"
                  >
                    Remember me
                  </Label>
                  <Switch
                    id="remember-me"
                    size="sm"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                  />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || !password}
                  className="w-full"
                >
                  {submitting ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="size-3.5 animate-spin"
                      strokeWidth={2}
                    />
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {authState === "setup" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={LockPasswordIcon}
                  className="size-4 text-primary"
                  strokeWidth={1.5}
                />
                <CardTitle>Create your password</CardTitle>
              </div>
              <CardDescription>
                Set up a password to protect your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setup-password">Password</Label>
                  <PasswordInput
                    id="setup-password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Minimum 8 characters"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm your password"
                  />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || !password || !confirmPassword}
                  className="w-full"
                >
                  {submitting ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="size-3.5 animate-spin"
                      strokeWidth={2}
                    />
                  ) : (
                    "Create password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
