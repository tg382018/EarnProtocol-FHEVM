import { useState, useEffect } from "react";
import { Signer } from "ethers";
import { getEthersSigner } from "@/lib/wagmi-adapter/client-to-signer";
import { useConfig, useAccount, useChainId } from "wagmi";

export function useSigner() {
  const config = useConfig();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [signer, setSigner] = useState<Signer | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setSigner(null);
      return;
    }

    const initSigner = async () => {
      try {
        const s = await getEthersSigner(config, { chainId });
        if (!s) {
          console.warn("Failed to initialize signer");
          return;
        }
        setSigner(s);
      } catch (error) {
        console.error("Error initializing signer:", error);
        setSigner(null);
      }
    };

    // Delay to ensure wallet is fully connected
    const timeoutId = setTimeout(initSigner, 1000);

    return () => clearTimeout(timeoutId);
  }, [config, isConnected, address, chainId]);

  return { signer };
}
