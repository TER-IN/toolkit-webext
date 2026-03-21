import type { ChainImporter, ImportPrefillResult } from "./types";

export const polkadotImporter: ChainImporter = {
    chain: "polkadot",

    async importTransaction(txHash: string): Promise<ImportPrefillResult> {
        return {
            chain: "polkadot",
            txHash,
            warnings: ["Autofill for Polkadot is not implemented yet. Please fill manually."],
        };
    },
};
