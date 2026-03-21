import type { ChainImporter, ImportPrefillResult } from "./types";

export const solanaImporter: ChainImporter = {
    chain: "solana",

    async importTransaction(txHash: string): Promise<ImportPrefillResult> {
        return {
            chain: "solana",
            txHash,
            warnings: ["Autofill for Solana is not implemented yet. Please fill manually."],
        };
    },
};
