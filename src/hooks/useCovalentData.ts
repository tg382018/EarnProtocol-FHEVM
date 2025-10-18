import { useState, useEffect } from "react";
import { NEXT_PUBLIC_COVALENT_API_KEY } from "@/config/env";

interface CovalentData {
  walletAge: number;
  transactionCount: number;
  totalVolume: number;
  nftHoldings: number;
  defiInteractions: number;
  // Yeni eklenen veriler
  totalGasUsed: number;
  averageTransactionValue: number;
  uniqueContracts: number;
  tokenDiversity: number;
  lastActivity: string;
  // Detaylı analiz
  ethBalance: number;
  tokenCount: number;
  contractInteractions: Array<{
    contract: string;
    name: string;
    interactions: number;
  }>;
}

interface CovalentResponse {
  data: {
    items: Array<{
      contract_address: string;
      contract_name: string;
      contract_ticker_symbol: string;
      balance: string;
      quote: number;
    }>;
  };
}

interface TransactionResponse {
  data: {
    items: Array<{
      block_signed_at: string;
      tx_hash: string;
      gas_spent: number;
      gas_price: number;
      value: string;
      to_address: string;
      from_address: string;
      successful: boolean;
      log_events: Array<{
        contract_address: string;
        contract_name: string;
      }>;
    }>;
  };
}

export const useCovalentData = (address: string | undefined) => {
  const [data, setData] = useState<CovalentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = async () => {
    if (!address || !NEXT_PUBLIC_COVALENT_API_KEY) {
      console.log("Missing address or API key:", {
        address,
        apiKey: NEXT_PUBLIC_COVALENT_API_KEY,
      });
      return;
    }

    console.log(
      "Fetching Ethereum Mainnet data for connected wallet:",
      address
    );
    setLoading(true);
    setError(null);

    try {
      // Fetch token balances from Ethereum Mainnet (chain ID: 1)
      const balancesResponse = await fetch(
        `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?key=${NEXT_PUBLIC_COVALENT_API_KEY}`
      );
      const balancesData: CovalentResponse = await balancesResponse.json();

      // Fetch transaction history from Ethereum Mainnet (chain ID: 1)
      const txResponse = await fetch(
        `https://api.covalenthq.com/v1/1/address/${address}/transactions_v2/?key=${NEXT_PUBLIC_COVALENT_API_KEY}&page-size=1000&quote-currency=USD`
      );
      const txData: TransactionResponse = await txResponse.json();

      // Calculate wallet age (simplified - using first transaction)
      const firstTx = txData.data?.items?.[txData.data.items.length - 1];
      const walletAge = firstTx
        ? Math.floor(
            (Date.now() - new Date(firstTx.block_signed_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 365;

      // Calculate total volume (ETH + token values)
      const totalVolume =
        balancesData.data?.items?.reduce((sum, item) => {
          if (item.contract_ticker_symbol === "ETH") {
            // ETH için balance'ı ETH'ye çevir ve USD fiyatıyla çarp (test için 2000 USD)
            const ethAmount = parseFloat(item.balance) / Math.pow(10, 18);
            return sum + ethAmount * 2000; // Test için sabit fiyat
          }
          return sum + (item.quote || 0);
        }, 0) || 0;

      // Count NFT holdings (simplified)
      const nftHoldings =
        balancesData.data?.items?.filter(
          (item) =>
            item.contract_name?.toLowerCase().includes("nft") ||
            item.contract_name?.toLowerCase().includes("token")
        ).length || 0;

      // Count DeFi interactions (simplified)
      const defiInteractions =
        txData.data?.items?.filter(
          (tx) =>
            tx.to_address &&
            (tx.to_address.toLowerCase().includes("uniswap") ||
              tx.to_address.toLowerCase().includes("compound") ||
              tx.to_address.toLowerCase().includes("aave"))
        ).length || 0;

      // Yeni detaylı analizler
      const transactions = txData.data?.items || [];

      // Gas kullanımı
      const totalGasUsed = transactions.reduce(
        (sum, tx) => sum + (tx.gas_spent || 0),
        0
      );

      // Ortalama işlem değeri (Wei'den ETH'ye çevir)
      const totalValue = transactions.reduce(
        (sum, tx) => sum + parseFloat(tx.value || "0"),
        0
      );
      const averageTransactionValue =
        transactions.length > 0
          ? totalValue / Math.pow(10, 18) / transactions.length
          : 0;

      // Benzersiz kontrat sayısı
      const uniqueContracts = new Set(
        transactions
          .map((tx) => tx.to_address)
          .filter((addr) => addr && addr !== address)
      ).size;

      // Token çeşitliliği
      const tokenDiversity = balancesData.data?.items?.length || 0;

      // Son aktivite
      const lastActivity =
        transactions.length > 0
          ? transactions[0].block_signed_at
          : new Date().toISOString();

      // ETH bakiyesi (Wei'den ETH'ye çevir)
      const ethItem = balancesData.data?.items?.find(
        (item) => item.contract_ticker_symbol === "ETH"
      );
      console.log("ETH Item found:", ethItem);
      const ethBalance = ethItem
        ? parseFloat(ethItem.balance) / Math.pow(10, 18)
        : 0;
      console.log("ETH Balance calculated:", ethBalance);

      // Token sayısı
      const tokenCount =
        balancesData.data?.items?.filter(
          (item) =>
            item.contract_ticker_symbol !== "ETH" &&
            parseFloat(item.balance) > 0
        ).length || 0;

      // Kontrat etkileşimleri
      const contractMap = new Map<
        string,
        { name: string; interactions: number }
      >();
      transactions.forEach((tx) => {
        if (tx.to_address && tx.to_address !== address) {
          const contractName =
            tx.log_events?.[0]?.contract_name || "Unknown Contract";
          const current = contractMap.get(tx.to_address) || {
            name: contractName,
            interactions: 0,
          };
          contractMap.set(tx.to_address, {
            ...current,
            interactions: current.interactions + 1,
          });
        }
      });

      const contractInteractions = Array.from(contractMap.entries())
        .map(([contract, data]) => ({ contract, ...data }))
        .sort((a, b) => b.interactions - a.interactions)
        .slice(0, 10); // Top 10

      setData({
        walletAge,
        transactionCount: transactions.length,
        totalVolume: Math.floor(totalVolume),
        nftHoldings,
        defiInteractions,
        totalGasUsed,
        averageTransactionValue,
        uniqueContracts,
        tokenDiversity,
        lastActivity,
        ethBalance,
        tokenCount,
        contractInteractions,
      });
    } catch (err) {
      console.error("Covalent API error:", err);
      setError("Failed to fetch wallet data");

      // Fallback to mock data
      setData({
        walletAge: 365,
        transactionCount: 1250,
        totalVolume: 50000,
        nftHoldings: 15,
        defiInteractions: 89,
        totalGasUsed: 2500000,
        averageTransactionValue: 0.5,
        uniqueContracts: 45,
        tokenDiversity: 12,
        lastActivity: new Date().toISOString(),
        ethBalance: 2.5,
        tokenCount: 8,
        contractInteractions: [
          { contract: "0x1234...", name: "Uniswap V3", interactions: 25 },
          { contract: "0x5678...", name: "Compound", interactions: 15 },
          { contract: "0x9abc...", name: "Aave", interactions: 10 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchWalletData();
    }
  }, [address]);

  return {
    data,
    loading,
    error,
    refetch: fetchWalletData,
  };
};
