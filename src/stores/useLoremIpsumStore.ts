/**
 * Lorem Ipsum Store — persists last-used settings
 */

import { create } from "zustand";
import { StorageManager } from "@/lib/storage";
import {
  DEFAULT_LOREM_OPTIONS,
  type LoremGeneratorOptions,
} from "@/lib/lorem-ipsum";

interface LoremIpsumState {
  // Last-used settings
  lastOptions: LoremGeneratorOptions;
  isLoading: boolean;

  // Actions
  loadOptions: () => Promise<void>;
  saveOptions: (options: LoremGeneratorOptions) => Promise<void>;
}

export const useLoremIpsumStore = create<LoremIpsumState>((set) => ({
  lastOptions: { ...DEFAULT_LOREM_OPTIONS },
  isLoading: true,

  loadOptions: async () => {
    const options = await StorageManager.get<LoremGeneratorOptions>(
      "lorem_ipsum_last_options",
      { ...DEFAULT_LOREM_OPTIONS }
    );
    set({ lastOptions: options, isLoading: false });
  },

  saveOptions: async (options) => {
    await StorageManager.set("lorem_ipsum_last_options", options);
    set({ lastOptions: options });
  },
}));
