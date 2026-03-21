import type { ChainImporter, ImportPrefillResult } from "./types";

export const suiImporter: ChainImporter = {
    chain: "sui",

    async importTransaction(txHash: string): Promise<ImportPrefillResult> {
        return {
            chain: "sui",
            txHash,
            warnings: ["Autofill for Sui is not implemented yet. Please fill manually."],
        };
    },
};
