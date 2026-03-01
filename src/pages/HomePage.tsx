// ============================================
// TERIN Toolkit — Home Page
// ============================================

import { Paintbrush, Link2, FolderOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";

const TOOLS = [
    {
        to: "/css-injector",
        title: "CSS Injector",
        description: "Force dark/light mode on any website with custom CSS overrides.",
        icon: Paintbrush,
    },
    {
        to: "/url-shortener",
        title: "URL Shortener",
        description: "Create short URLs for easy sharing within your team.",
        icon: Link2,
    },
    {
        to: "/bookmarks",
        title: "Bookmarks",
        description: "Save, organise, and search your bookmarks with folders.",
        icon: FolderOpen,
    },
] as const;

export function HomePage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome to TERIN Toolkit</h1>
                <p className="mt-2 text-muted-foreground">
                    Your developer productivity toolkit — right in the browser.
                </p>
            </div>

            {/* Tool cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Link key={tool.title} to={tool.to} className="block">
                            <Card className="transition-shadow hover:shadow-md cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{tool.title}</CardTitle>
                                            <CardDescription className="text-xs mt-1">
                                                {tool.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
