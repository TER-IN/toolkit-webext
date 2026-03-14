// ============================================
// TERIN Toolkit — Home Page
// ============================================

import { Paintbrush, Link2, FolderOpen, Type, ArrowLeftRight, CodeXml } from "lucide-react";
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
        to: "/url-tools",
        title: "URL Tools",
        description: "Shorten, encode, and decode URLs for your team.",
        icon: Link2,
    },
    {
        to: "/bookmarks",
        title: "Bookmarks",
        description: "Save, organise, and search your bookmarks with folders.",
        icon: FolderOpen,
    },
    {
        to: "/string-tools",
        title: "String Tools",
        description: "Transform, measure, and clean up text — case conversion, accents, spaces.",
        icon: Type,
    },
    {
        to: "/programming-tools",
        title: "Programming Tools",
        description: "Syntax highlighting, JSON formatting, Markdown preview, and more developer utilities.",
        icon: CodeXml,
    },
    {
        to: "/converters",
        title: "Converters",
        description: "Encode & decode between text, binary, and Base64 formats.",
        icon: ArrowLeftRight,
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
                        <Link key={tool.title} to={tool.to} tabIndex={0} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
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
