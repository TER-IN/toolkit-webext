/**
 * Monte Carlo Store — persists custom presets and last-used config
 */

import { create } from "zustand";
import { StorageManager } from "@/lib/storage";
import type { MonteCarloConfig } from "@/lib/finance/monte-carlo";
import { DEFAULT_CONFIG } from "@/lib/finance/monte-carlo";

export interface CustomPreset {
  id: string;
  name: string;
  description: string;
  config: MonteCarloConfig;
}

interface MonteCarloState {
  // Custom presets
  customPresets: Record<string, CustomPreset>;
  isLoading: boolean;

  // Last-used config (for convenience)
  lastConfig: MonteCarloConfig;

  // Actions
  loadPresets: () => Promise<void>;
  saveCustomPreset: (name: string, config: MonteCarloConfig, description?: string) => Promise<string>;
  renameCustomPreset: (id: string, newName: string) => Promise<void>;
  deleteCustomPreset: (id: string) => Promise<void>;
  saveLastConfig: (config: MonteCarloConfig) => Promise<void>;
}

export const useMonteCarloStore = create<MonteCarloState>((set, get) => ({
  customPresets: {},
  isLoading: true,
  lastConfig: { ...DEFAULT_CONFIG },

  loadPresets: async () => {
    const [presets, lastConfig] = await Promise.all([
      StorageManager.get<Record<string, CustomPreset>>("monte_carlo_presets", {}),
      StorageManager.get<MonteCarloConfig>("monte_carlo_last_config", { ...DEFAULT_CONFIG }),
    ]);
    set({ customPresets: presets, lastConfig, isLoading: false });
  },

  saveCustomPreset: async (name, config, description = "Custom preset") => {
    const id = crypto.randomUUID();
    const newPreset: CustomPreset = { id, name, description, config };
    const updated = { ...get().customPresets, [id]: newPreset };
    await StorageManager.set("monte_carlo_presets", updated);
    set({ customPresets: updated });
    return id;
  },

  renameCustomPreset: async (id, newName) => {
    const existing = get().customPresets[id];
    if (!existing) return;
    const updated = {
      ...get().customPresets,
      [id]: { ...existing, name: newName },
    };
    await StorageManager.set("monte_carlo_presets", updated);
    set({ customPresets: updated });
  },

  deleteCustomPreset: async (id) => {
    const updated = { ...get().customPresets };
    delete updated[id];
    await StorageManager.set("monte_carlo_presets", updated);
    set({ customPresets: updated });
  },

  saveLastConfig: async (config) => {
    await StorageManager.set("monte_carlo_last_config", config);
    set({ lastConfig: config });
  },
}));
