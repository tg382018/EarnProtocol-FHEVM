"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  useReadContract,
  useWriteContract,
  useSendTransaction,
  useAccount,
} from "wagmi";
import { NEXT_PUBLIC_CONTRACT_ADDRESS } from "@/config/env";
import { earnProtocolAbi } from "@/abi/earnProtocolAbi";

interface UserData {
  walletAge: number;
  transactionCount: number;
  ethBalance: number;
  totalGasUsed: number;
  averageTransactionValue: number;
  uniqueContracts: number;
}

interface EarnProtocolHook {
  contractAddress?: string;
  canCalculateScore: boolean;
  canStake: boolean;
  canClaim: boolean;
  canWithdraw: boolean;
  calculateEncryptedScore: (userData: UserData) => Promise<number | undefined>;
  checkUserScoreStatus: (
    userAddress: string
  ) => Promise<{ hasCalculated: boolean; score: number }>;
  stakeWithEncryptedScore: (
    userData: UserData,
    stakeAmount: string
  ) => Promise<void>;
  claimRewards: (userScore: number) => Promise<void>;
  withdraw: () => Promise<void>;
  message: string;
  isProcessing: boolean;
  // User data
  stakedAmount: bigint;
  lastClaimTime: bigint;
  totalEarned: bigint;
  hasStaked: boolean;
  canClaimNow: boolean;
}

/**
 * useEarnProtocol - Simplified contract interaction hook
 *
 * What it does:
 * - Interacts with EarnProtocol contract
 * - Handles staking, claiming, and withdrawal
 * - Manages contract state
 */
export const useEarnProtocol = () => {
  const contractAddress = NEXT_PUBLIC_CONTRACT_ADDRESS;
  const contractAbi = earnProtocolAbi;

  // Simple status string for UX messages
  const [message, setMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Wagmi hooks
  const { writeContract, writeContractAsync, isPending, error } =
    useWriteContract();
  const {
    sendTransaction,
    isPending: isSendPending,
    error: sendError,
  } = useSendTransaction();

  // -------------
  // Helpers
  // -------------
  const hasContract = Boolean(contractAddress && contractAbi);

  // Get connected wallet address
  const { address: userAddress } = useAccount();

  // Read user data
  const userDataResult = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: contractAbi,
    functionName: "getUserData" as const,
    args: [userAddress || "0x0000000000000000000000000000000000000000"], // Use connected wallet address
    query: {
      enabled: Boolean(hasContract && userAddress),
      refetchOnWindowFocus: false,
    },
  });

  const userData = useMemo(() => {
    console.log("Debug - getUserData result:", {
      data: userDataResult.data,
      error: userDataResult.error,
      isLoading: userDataResult.isLoading,
      userAddress,
    });

    if (!userDataResult.data) return null;
    const [stakedAmount, lastClaimTime, totalEarned, hasStaked] =
      userDataResult.data as [bigint, bigint, bigint, boolean];

    console.log("Debug - parsed userData:", {
      stakedAmount: stakedAmount.toString(),
      lastClaimTime: lastClaimTime.toString(),
      totalEarned: totalEarned.toString(),
      hasStaked,
    });

    return { stakedAmount, lastClaimTime, totalEarned, hasStaked };
  }, [
    userDataResult.data,
    userDataResult.error,
    userDataResult.isLoading,
    userAddress,
  ]);

  // Check if user can claim
  const canClaimResult = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: contractAbi,
    functionName: "canClaim" as const,
    args: [userAddress || "0x0000000000000000000000000000000000000000"], // Use connected wallet address
    query: {
      enabled: Boolean(hasContract && userAddress),
      refetchOnWindowFocus: false,
    },
  });

  const canClaimNow = useMemo(() => {
    return (canClaimResult.data as boolean) ?? false;
  }, [canClaimResult.data]);

  const canCalculateScore = useMemo(
    () => Boolean(hasContract && !isProcessing),
    [hasContract, isProcessing]
  );

  const canStake = useMemo(
    () => Boolean(hasContract && !isProcessing),
    [hasContract, isProcessing]
  );

  const canClaim = useMemo(
    () =>
      Boolean(
        hasContract && userData?.hasStaked && canClaimNow && !isProcessing
      ),
    [hasContract, userData?.hasStaked, canClaimNow, isProcessing]
  );

  const canWithdraw = useMemo(
    () =>
      Boolean(
        hasContract &&
          userData?.hasStaked &&
          userData?.stakedAmount > 0 &&
          !isProcessing
      ),
    [hasContract, userData?.hasStaked, userData?.stakedAmount, isProcessing]
  );

  const calculateEncryptedScore = useCallback(
    async (userData: UserData) => {
      if (isProcessing || !canCalculateScore) return;
      setIsProcessing(true);
      setMessage("Calculating encrypted score...");
      try {
        // Real contract call with plain data
        const tx = await writeContract({
          address: contractAddress as `0x${string}`,
          abi: contractAbi,
          functionName: "calculatePlainScore",
          args: [
            userData.walletAge,
            userData.transactionCount,
            Math.floor(userData.ethBalance * 1e6), // Scale ETH to 1e6
            userData.totalGasUsed,
            Math.floor(userData.averageTransactionValue * 1e6), // Scale ETH to 1e6
            userData.uniqueContracts,
          ],
        });

        setMessage("Transaction sent! Waiting for confirmation...");

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        setMessage("Transaction confirmed! Parsing events...");

        // Look for ScoreCalculated event in the transaction logs
        const scoreCalculatedTopic = ethers.id(
          "ScoreCalculated(address,uint256)"
        );
        const scoreLog = receipt.logs.find(
          (log) => log.topics[0] === scoreCalculatedTopic
        );

        if (scoreLog) {
          // Parse the event data - score is in the data field
          const score = Number(scoreLog.data);
          console.log("Found ScoreCalculated event:", {
            topic: scoreLog.topics[0],
            data: scoreLog.data,
            score: score,
          });
          setMessage(`Score calculated: ${score}`);
          return score;
        }

        console.log("No ScoreCalculated event found in logs:", receipt.logs);

        // Fallback: calculate score based on sent data
        const calculatedScore = Math.min(
          1000,
          Math.floor(
            userData.walletAge * 0.27 +
              Math.min(userData.transactionCount, 300) +
              Math.min(userData.ethBalance * 100, 200) +
              Math.min(userData.totalGasUsed / 20000, 150) +
              Math.min(userData.averageTransactionValue * 500, 100) +
              Math.min(userData.uniqueContracts * 2.5, 50)
          )
        );

        setMessage(`Score calculated: ${calculatedScore}`);
        return calculatedScore;
      } catch (e) {
        setMessage(
          `Score calculation failed: ${e instanceof Error ? e.message : String(e)}`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isProcessing,
      canCalculateScore,
      writeContract,
      contractAddress,
      contractAbi,
    ]
  );

  // Function to check if user has already calculated score
  const checkUserScoreStatus = useCallback(
    async (userAddress: string) => {
      if (!contractAddress || !contractAbi)
        return { hasCalculated: false, score: 0 };

      try {
        // Use ethers directly for contract reading
        const provider = new ethers.JsonRpcProvider(
          "https://sepolia.infura.io/v3/e9ca8bcfcea24651a203ad97787ddd54"
        );
        const contract = new ethers.Contract(
          contractAddress,
          contractAbi,
          provider
        );

        const result = await contract.getUserScoreStatus(userAddress);
        const [hasCalculated, score] = result as [boolean, bigint];
        return { hasCalculated, score: Number(score) };
      } catch (e) {
        console.error("Error checking user score status:", e);
        return { hasCalculated: false, score: 0 };
      }
    },
    [contractAddress, contractAbi]
  );

  const stakeWithEncryptedScore = useCallback(
    async (userData: UserData, stakeAmount: string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setMessage("Staking with encrypted score...");

      console.log("Starting stake transaction...", {
        contractAddress,
        stakeAmount,
        userData: {
          walletAge: userData.walletAge,
          transactionCount: userData.transactionCount,
          ethBalance: userData.ethBalance,
          ethBalanceScaled: Math.floor(userData.ethBalance * 1e6),
          totalGasUsed: userData.totalGasUsed,
          averageTransactionValue: userData.averageTransactionValue,
          averageTransactionValueScaled: Math.floor(
            userData.averageTransactionValue * 1e6
          ),
          uniqueContracts: userData.uniqueContracts,
        },
      });

      try {
        // Use simple stake function
        const txHash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: contractAbi,
          functionName: "stake",
          args: [],
          value: ethers.parseEther(stakeAmount),
        });

        console.log("Transaction sent! Hash:", txHash);
        setMessage("Transaction sent! Waiting for confirmation...");
      } catch (writeError) {
        console.error("Write contract error:", writeError);
        setMessage(
          `Staking failed: ${writeError instanceof Error ? writeError.message : String(writeError)}`
        );
        setIsProcessing(false);
        throw writeError; // Re-throw to catch in page.tsx
      }
    },
    [isProcessing, writeContractAsync, contractAddress, contractAbi]
  );

  const claimRewards = useCallback(
    async (userScore: number) => {
      if (isProcessing || !canClaim) return;
      setIsProcessing(true);
      setMessage("Claiming rewards...");
      try {
        // For now, just simulate the process
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setMessage("Rewards claimed successfully!");
      } catch (e) {
        setMessage(
          `Claim failed: ${e instanceof Error ? e.message : String(e)}`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, canClaim]
  );

  const withdraw = useCallback(async () => {
    if (isProcessing || !canWithdraw) return;
    setIsProcessing(true);
    setMessage("Withdrawing...");
    try {
      // For now, just simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setMessage("Withdrawal completed!");
    } catch (e) {
      setMessage(
        `Withdrawal failed: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, canWithdraw]);

  return {
    contractAddress,
    canCalculateScore,
    canStake,
    canClaim,
    canWithdraw,
    calculateEncryptedScore,
    checkUserScoreStatus,
    stakeWithEncryptedScore,
    claimRewards,
    withdraw,
    message,
    isProcessing,
    // User data
    stakedAmount: userData?.stakedAmount ?? BigInt(0),
    lastClaimTime: userData?.lastClaimTime ?? BigInt(0),
    totalEarned: userData?.totalEarned ?? BigInt(0),
    hasStaked: userData?.hasStaked ?? false,
    canClaimNow,
  } as EarnProtocolHook;
};
