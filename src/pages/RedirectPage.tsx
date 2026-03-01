// ============================================
// TERIN Toolkit — Redirect Page
// ============================================
// Resolves short URL codes and redirects to the original URL.
// Mounted at /go/:code (outside the DashboardLayout).

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { StorageManager } from "@/lib/storage";
import type { ShortUrlsMap } from "@/types";

const SHORT_URLS_KEY = "short_urls";

export function RedirectPage() {
    const { code } = useParams<{ code: string }>();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        async function resolve() {
            if (!code) {
                setNotFound(true);
                return;
            }
            const shortUrls = await StorageManager.get<ShortUrlsMap>(SHORT_URLS_KEY, {});
            const entry = Object.values(shortUrls).find((s) => s.code === code);
            if (entry) {
                // Navigate to the original URL
                window.location.replace(entry.originalUrl);
            } else {
                setNotFound(true);
            }
        }
        resolve();
    }, [code]);

    if (notFound) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-3xl">
                    🔗
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Short URL Not Found</h1>
                <p className="text-muted-foreground text-sm">
                    The code <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">{code}</code> does not
                    match any saved short URL.
                </p>
                <Link
                    to="/url-shortener"
                    className="mt-2 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                >
                    ← Go to URL Shortener Dashboard
                </Link>
            </div>
        );
    }

    // While resolving, show a brief loading state
    return (
        <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
            <p className="text-sm">Redirecting…</p>
        </div>
    );
}
