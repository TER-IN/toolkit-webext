import type { ChainImporter, ImportPrefillResult } from "./types";

export const dogecoinImporter: ChainImporter = {
    chain: "dogecoin",

    async importTransaction(txHash: string): Promise<ImportPrefillResult> {
        return {
            chain: "dogecoin",
            txHash,
            warnings: ["Autofill for Dogecoin is not implemented yet. Please fill manually."],
        };
    },
};
