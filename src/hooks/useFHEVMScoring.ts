import { useState } from "react";
import { getInstance } from "@/lib/fhevm/fhevmjs";
import { useFhevm } from "@/providers/FhevmProvider";

interface UserData {
  walletAge: number;
  transactionCount: number;
  totalVolume: number;
  nftHoldings: number;
  defiInteractions: number;
}

interface EncryptedScore {
  handles: Uint8Array[];
  inputProof: Uint8Array;
}

export const useFHEVMScoring = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [encryptedScore, setEncryptedScore] = useState<EncryptedScore | null>(
    null
  );
  const [publicScore, setPublicScore] = useState<number | null>(null);
  const { instanceStatus } = useFhevm();

  const calculateEncryptedScore = async (
    userData: UserData,
    contractAddress: string,
    userAddress: string
  ): Promise<{ encryptedScore: EncryptedScore; publicScore: number }> => {
    if (instanceStatus !== "ready") {
      console.log("FHEVM instance not ready, using mock score");
      // Return mock score for now
      const mockScore = Math.min(
        1000,
        Math.floor(
          // Cüzdan yaşı (max 200 puan)
          Math.min(200, userData.walletAge * 0.27) +
            // İşlem sayısı (max 300 puan)
            Math.min(300, userData.transactionCount * 1.0) +
            // ETH bakiyesi (max 200 puan)
            Math.min(200, userData.ethBalance * 100) +
            // Gas kullanımı (max 150 puan)
            Math.min(150, (userData.totalGasUsed || 0) / 20000) +
            // Ortalama işlem değeri (max 100 puan)
            Math.min(100, (userData.averageTransactionValue || 0) * 500) +
            // Benzersiz kontratlar (max 50 puan)
            Math.min(50, (userData.uniqueContracts || 0) * 2.5)
        )
      );
      return { encryptedScore: null, publicScore: mockScore };
    }

    setIsCalculating(true);

    try {
      const instance = getInstance();

      if (!instance) {
        console.log("FHEVM instance not available, using mock score");
        const mockScore = Math.min(
          1000,
          Math.floor(
            // Cüzdan yaşı (max 200 puan)
            Math.min(200, userData.walletAge * 0.27) +
              // İşlem sayısı (max 300 puan)
              Math.min(300, userData.transactionCount * 1.0) +
              // ETH bakiyesi (max 200 puan)
              Math.min(200, userData.ethBalance * 100) +
              // Gas kullanımı (max 150 puan)
              Math.min(150, (userData.totalGasUsed || 0) / 20000) +
              // Ortalama işlem değeri (max 100 puan)
              Math.min(100, (userData.averageTransactionValue || 0) * 500) +
              // Benzersiz kontratlar (max 50 puan)
              Math.min(50, (userData.uniqueContracts || 0) * 2.5)
          )
        );
        return { encryptedScore: null, publicScore: mockScore };
      }

      // Create encrypted input with user data
      const encryptedInput = await instance
        .createEncryptedInput(contractAddress, userAddress)
        .add64(BigInt(userData.walletAge))
        .add64(BigInt(userData.transactionCount))
        .add64(BigInt(userData.totalVolume))
        .add64(BigInt(userData.nftHoldings))
        .add64(BigInt(userData.defiInteractions))
        .encrypt();

      // Calculate public score based on key metrics
      const publicScore = Math.min(
        1000,
        Math.floor(
          // Cüzdan yaşı (max 200 puan) - 1 yıl = 100 puan
          Math.min(200, userData.walletAge * 0.27) +
            // İşlem sayısı (max 300 puan) - 100 işlem = 100 puan
            Math.min(300, userData.transactionCount * 1.0) +
            // ETH bakiyesi (max 200 puan) - 1 ETH = 100 puan
            Math.min(200, userData.ethBalance * 100) +
            // Gas kullanımı (max 150 puan) - 1M gas = 50 puan
            Math.min(150, (userData.totalGasUsed || 0) / 20000) +
            // Ortalama işlem değeri (max 100 puan) - 0.1 ETH = 50 puan
            Math.min(100, (userData.averageTransactionValue || 0) * 500) +
            // Benzersiz kontratlar (max 50 puan) - 10 kontrat = 25 puan
            Math.min(50, (userData.uniqueContracts || 0) * 2.5)
        )
      );

      setEncryptedScore(encryptedInput);
      setPublicScore(publicScore);

      return { encryptedScore: encryptedInput, publicScore };
    } catch (error) {
      console.error("FHEVM scoring error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateInterestRate = (score: number): number => {
    // Dynamic interest rate based on score
    if (score >= 900) return 15.0;
    if (score >= 800) return 12.5;
    if (score >= 700) return 10.0;
    if (score >= 600) return 8.0;
    if (score >= 500) return 6.0;
    return 4.0;
  };

  const resetScore = () => {
    setEncryptedScore(null);
    setPublicScore(null);
  };

  return {
    calculateEncryptedScore,
    calculateInterestRate,
    isCalculating,
    encryptedScore,
    publicScore,
    resetScore,
  };
};
