'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, MailCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { forgotPasswordSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const parsed = forgotPasswordSchema.safeParse({
            email: formData.get('email'),
        });

        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Invalid input');
            setLoading(false);
            return;
        }

        const { error: authError } = await authClient.requestPasswordReset({
            email: parsed.data.email,
            redirectTo: '/reset-password',
        });

        if (authError) {
            setError(authError.message ?? 'Could not send reset link');
            setLoading(false);
            return;
        }

        setSent(true);
        setLoading(false);
    }

    return (
        <main className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="bg-primary text-primary-foreground mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                        {sent ? (
                            <MailCheck className="h-5 w-5" />
                        ) : (
                            <Sparkles className="h-5 w-5" />
                        )}
                    </div>
                    <CardTitle className="text-xl">
                        {sent ? 'Check your inbox' : 'Reset your password'}
                    </CardTitle>
                    <CardDescription>
                        {sent
                            ? 'If an account exists for that email, a reset link has been sent.'
                            : 'Enter your email and we will send a reset link.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <div className="space-y-4">
                            <div className="text-muted-foreground bg-muted space-y-2 rounded-md px-3 py-2 text-xs">
                                <p>
                                    Running Lumen locally? The reset link is printed to the dev
                                    server console <em>and</em> saved to a file. To grab it from a
                                    terminal:
                                </p>
                                <pre className="bg-background overflow-x-auto rounded px-2 py-1 font-mono">
                                    cat ~/.lumen/last-reset-url.txt
                                </pre>
                            </div>
                            <Button
                                render={<Link href="/login" />}
                                variant="outline"
                                className="w-full"
                            >
                                Back to sign in
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    placeholder="you@example.com"
                                />
                            </div>

                            {error && (
                                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                    {error}
                                </p>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending…' : 'Send reset link'}
                            </Button>
                        </form>
                    )}

                    <p className="text-muted-foreground mt-4 text-center text-sm">
                        Remembered it?{' '}
                        <Link
                            href="/login"
                            className="text-foreground underline hover:no-underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
