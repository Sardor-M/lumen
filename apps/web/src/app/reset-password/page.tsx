'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ShieldCheck, ShieldAlert } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { resetPasswordSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const tokenError = searchParams.get('error');

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!token) return;
        setError(null);
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const parsed = resetPasswordSchema.safeParse({
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
        });

        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Invalid input');
            setLoading(false);
            return;
        }

        const { error: authError } = await authClient.resetPassword({
            newPassword: parsed.data.password,
            token,
        });

        if (authError) {
            setError(authError.message ?? 'Reset failed — the link may have expired');
            setLoading(false);
            return;
        }

        setDone(true);
        setLoading(false);
        setTimeout(() => router.push('/login'), 1500);
    }

    /** No token at all, or Better Auth signaled an invalid/expired one via ?error=. */
    if (!token || tokenError) {
        return (
            <main className="flex min-h-screen items-center justify-center px-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="bg-destructive/15 text-destructive mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-xl">Link expired</CardTitle>
                        <CardDescription>
                            This reset link is invalid or has expired. Request a new one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button render={<Link href="/forgot-password" />} className="w-full">
                            Request a new link
                        </Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="bg-primary text-primary-foreground mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                        {done ? (
                            <ShieldCheck className="h-5 w-5" />
                        ) : (
                            <Sparkles className="h-5 w-5" />
                        )}
                    </div>
                    <CardTitle className="text-xl">
                        {done ? 'Password updated' : 'Choose a new password'}
                    </CardTitle>
                    <CardDescription>
                        {done
                            ? 'Redirecting you to sign in…'
                            : 'At least 8 characters. Use something you have not used elsewhere.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!done && (
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium">
                                    New password
                                </label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="text-sm font-medium">
                                    Confirm password
                                </label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                />
                            </div>

                            {error && (
                                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                    {error}
                                </p>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Updating…' : 'Update password'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
