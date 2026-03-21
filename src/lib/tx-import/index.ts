import type { SupportedImportChain, ImportPrefillResult } from "./types";
import type { ChainImporter } from "./types";
import { alchemyEvmImporter } from "./alchemyEvmImporter";
import { bitcoinImporter } from "./bitcoinImporter";
import { solanaImporter } from "./solanaImporter";
import { suiImporter } from "./suiImporter";
import { polkadotImporter } from "./polkadotImporter";
import { bittensorImporter } from "./bittensorImporter";
import { dogecoinImporter } from "./dogecoinImporter";

const importers: Record<SupportedImportChain, ChainImporter> = {
    "ethereum": alchemyEvmImporter,
    "avalanche-c": alchemyEvmImporter,
    "bitcoin": bitcoinImporter,
    "solana": solanaImporter,
    "sui": suiImporter,
    "polkadot": polkadotImporter,
    "bittensor": bittensorImporter,
    "dogecoin": dogecoinImporter,
};

export async function prefetchTransaction(
    chain: SupportedImportChain,
    txHash: string,
    apiKey?: string,
    recipientAddress?: string
): Promise<ImportPrefillResult> {
    const importer = importers[chain];
    if (!importer) {
        return {
            chain,
            txHash,
            warnings: ["Autofill for this chain is not implemented yet. Please fill manually."],
        };
    }
    return importer.importTransaction(txHash, apiKey, recipientAddress);
}

export { type ChainImporter, type ImportPrefillResult };
