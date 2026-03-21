import type { ChainImporter, ImportPrefillResult } from "./types";

export const bittensorImporter: ChainImporter = {
    chain: "bittensor",

    async importTransaction(txHash: string): Promise<ImportPrefillResult> {
        return {
            chain: "bittensor",
            txHash,
            warnings: ["Autofill for Bittensor is not implemented yet. Please fill manually."],
        };
    },
};
