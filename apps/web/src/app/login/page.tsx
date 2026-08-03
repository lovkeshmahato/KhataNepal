"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const DEMO_ACCOUNTS = [
  { label: "Owner", email: "owner@khatanepal.demo" },
  { label: "Branch Manager", email: "manager@khatanepal.demo" },
  { label: "Cashier", email: "cashier@khatanepal.demo" },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new ApiError(res.status, body);
      }
      const data = await res.json();
      setAuth(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.fullName.split(" ")[0]}`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--color-primary)_15%,transparent),transparent_50%),radial-gradient(circle_at_80%_80%,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
            K
          </div>
          <h1 className="text-xl font-semibold">KhataNepal</h1>
          <p className="text-sm text-muted-foreground">Sign in to your retail workspace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Sign in</CardTitle>
            <CardDescription>Use your organization email and password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="owner@khatanepal.demo" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-dashed border-border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Demo accounts (password: ChangeMe123!)</p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setValue("email", acc.email);
                      setValue("password", "ChangeMe123!");
                    }}
                    className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
