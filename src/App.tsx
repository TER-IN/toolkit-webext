import { HashRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { HomePage } from "@/pages/HomePage";
import { CssInjectorPage } from "@/pages/CssInjectorPage";
import { BookmarksPage } from "@/pages/BookmarksPage";
import { UrlShortenerPage } from "@/pages/UrlShortenerPage";
import { RedirectPage } from "@/pages/RedirectPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * Root application component.
 * Uses HashRouter since extension pages don't support the History API.
 */
function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="terin-ui-theme">
            <HashRouter>
                <Routes>
                    {/* Standalone redirect route (no dashboard layout) */}
                    <Route path="/go/:code" element={<RedirectPage />} />

                    <Route element={<DashboardLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/css-injector" element={<CssInjectorPage />} />
                        <Route path="/bookmarks" element={<BookmarksPage />} />
                        <Route path="/url-shortener" element={<UrlShortenerPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </HashRouter>
        </ThemeProvider>
    );
}

export default App;
