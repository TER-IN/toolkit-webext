// ============================================
// TERIN Toolkit — CSS Overrides Zustand Store
// ============================================
// Manages the state for per-domain CSS overrides.
// Persists to browser.storage.local via StorageManager.

import { create } from "zustand";
import type { CssOverride, CssOverridesMap } from "@/types";
import { StorageManager } from "@/lib/storage";

/** Default dark-mode CSS snippet (invert + hue-rotate, skip media) */
export const DEFAULT_DARK_CSS = `html {
  filter: invert(1) hue-rotate(180deg) !important;
}
img, video, iframe {
  filter: invert(1) hue-rotate(180deg) !important;
}`;

const STORAGE_KEY = "css_overrides";

interface CssOverrideState {
    overrides: CssOverridesMap;
    /** Whether the initial load from storage has completed */
    loaded: boolean;

    // ---- Actions ----
    /** Load all overrides from persistent storage */
    loadFromStorage: () => Promise<void>;
    /** Add or update an override for a hostname */
    addOverride: (override: CssOverride) => Promise<void>;
    /** Remove an override by hostname */
    removeOverride: (hostname: string) => Promise<void>;
    /** Toggle the enabled state of an override */
    toggleOverride: (hostname: string) => Promise<void>;
    /** Update just the CSS string for a hostname */
    updateCss: (hostname: string, css: string) => Promise<void>;
}

/**
 * Persist the current overrides map to storage.
 */
async function persistOverrides(overrides: CssOverridesMap): Promise<void> {
    await StorageManager.set(STORAGE_KEY, overrides);
}

export const useCssOverrideStore = create<CssOverrideState>()((set, get) => ({
    overrides: {},
    loaded: false,

    loadFromStorage: async () => {
        const data = await StorageManager.get<CssOverridesMap>(STORAGE_KEY, {});
        set({ overrides: data, loaded: true });
    },

    addOverride: async (override) => {
        const next = { ...get().overrides, [override.hostname]: override };
        set({ overrides: next });
        await persistOverrides(next);
    },

    removeOverride: async (hostname) => {
        const next = { ...get().overrides };
        delete next[hostname];
        set({ overrides: next });
        await persistOverrides(next);
    },

    toggleOverride: async (hostname) => {
        const current = get().overrides[hostname];
        if (!current) return;
        const next = {
            ...get().overrides,
            [hostname]: { ...current, enabled: !current.enabled },
        };
        set({ overrides: next });
        await persistOverrides(next);
    },

    updateCss: async (hostname, css) => {
        const current = get().overrides[hostname];
        if (!current) return;
        const next = {
            ...get().overrides,
            [hostname]: { ...current, css },
        };
        set({ overrides: next });
        await persistOverrides(next);
    },
}));
