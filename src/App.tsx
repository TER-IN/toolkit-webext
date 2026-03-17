import { HashRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { HomePage } from "@/pages/HomePage";
import { CssInjectorPage } from "@/pages/CssInjectorPage";
import { BookmarksPage } from "@/pages/BookmarksPage";
import { UrlToolsPage } from "@/pages/UrlToolsPage";
import { StringToolsPage } from "@/pages/StringToolsPage";
import { ConvertersPage } from "@/pages/ConvertersPage";
import { RedirectPage } from "@/pages/RedirectPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ProgrammingToolsPage } from "@/pages/ProgrammingToolsPage";
import { DateAndTimeToolsPage } from "@/pages/DateAndTimeToolsPage";
import { TextAndListToolsPage } from "@/pages/TextAndListToolsPage";
import { ImageToolsPage } from "@/pages/ImageToolsPage";
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
                        <Route path="/url-tools" element={<UrlToolsPage />} />
                        <Route path="/string-tools" element={<StringToolsPage />} />
                        <Route path="/programming-tools" element={<ProgrammingToolsPage />} />
                        <Route path="/date-and-time" element={<DateAndTimeToolsPage />} />
                        <Route path="/text-and-lists" element={<TextAndListToolsPage />} />
                        <Route path="/image-tools" element={<ImageToolsPage />} />
                        <Route path="/converters" element={<ConvertersPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </HashRouter>
        </ThemeProvider>
    );
}

export default App;
