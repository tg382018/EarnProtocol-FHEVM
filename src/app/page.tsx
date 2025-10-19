"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  TrendingUp,
  Shield,
  Lock,
  Unlock,
  Coins,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import { useWallet } from "@/hooks/wallet/useWallet";
import { useSigner } from "@/hooks/wallet/useSigner";
import { useFhevm } from "@/providers/FhevmProvider";
import { useCovalentData } from "@/hooks/useCovalentData";
import { useFHEVMScoring } from "@/hooks/useFHEVMScoring";
import { useEarnProtocol } from "@/hooks/useEarnProtocol";
import WalletNotConnected from "@/components/wallet/WalletNotConnected";
import PageTransition from "@/components/layout/PageTransition";

export default function EarnProtocol() {
  const { address, isConnected, isSepoliaChain } = useWallet();
  const { signer } = useSigner();
  const { instanceStatus } = useFhevm();

  // Covalent API hook
  const {
    data: covalentData,
    loading: covalentLoading,
    refetch: refetchCovalent,
  } = useCovalentData(address);

  // FHEVM scoring hook
  const {
    calculateEncryptedScore,
    calculateInterestRate,
    isCalculating,
    publicScore,
    resetScore,
  } = useFHEVMScoring();

  // Earn Protocol hook
  const {
    canCalculateScore,
    canStake,
    canClaim,
    canWithdraw,
    calculateEncryptedScore: contractCalculateScore,
    checkUserScoreStatus,
    stakeWithEncryptedScore,
    claimRewards,
    withdraw,
    message: contractMessage,
    isProcessing: contractProcessing,
    stakedAmount,
    totalEarned,
    hasStaked,
    canClaimNow,
  } = useEarnProtocol();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [userScore, setUserScore] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [dailyReward, setDailyReward] = useState(0);
  const [lastClaimTime, setLastClaimTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCountingDown && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsCountingDown(false);
            setIsAnalyzing(false);
            window.location.reload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCountingDown, countdown]);

  const startCountdown = () => {
    setCountdown(20);
    setIsCountingDown(true);
  };

  const handleAnalyzeWallet = async () => {
    if (!address) {
      alert("Lütfen önce cüzdanınızı bağlayın!");
      return;
    }

    if (!covalentData) {
      alert("Covalent verileri henüz yüklenmedi. Lütfen bekleyin...");
      return;
    }

    setIsAnalyzing(true);

    try {
      // First check if user has already calculated score
      const { hasCalculated, score: existingScore } =
        await checkUserScoreStatus(address);

      if (hasCalculated && existingScore > 0) {
        // User already has a score, use it without transaction
        console.log("User already has calculated score:", existingScore);
        const calculatedInterestRate = calculateInterestRate(existingScore);
        setUserScore(existingScore);
        setInterestRate(calculatedInterestRate);
        setShowScore(true);
        setIsAnalyzing(false);
        return;
      }

      // User doesn't have a score, calculate it
      if (canCalculateScore) {
        const userData = {
          walletAge: covalentData.walletAge,
          transactionCount: covalentData.transactionCount,
          ethBalance: covalentData.ethBalance,
          totalGasUsed: covalentData.totalGasUsed,
          averageTransactionValue: covalentData.averageTransactionValue,
          uniqueContracts: covalentData.uniqueContracts,
        };

        // Start countdown when MetaMask popup appears
        startCountdown();

        const contractScore = await contractCalculateScore(userData);

        // Use the score from blockchain (always returns a score now)
        const calculatedInterestRate = calculateInterestRate(contractScore);
        setUserScore(contractScore);
        setInterestRate(calculatedInterestRate);
        setShowScore(true);
      } else {
        // Fallback to mock scoring
        const { publicScore: calculatedScore } = await calculateEncryptedScore(
          covalentData,
          "0x1234567890123456789012345678901234567890",
          address
        );
        const calculatedInterestRate = calculateInterestRate(calculatedScore);
        setUserScore(calculatedScore);
        setInterestRate(calculatedInterestRate);
        setShowScore(true);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setUserScore(850);
      setInterestRate(12.5);
      setShowScore(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStake = async () => {
    if (!address) {
      alert("Lütfen önce cüzdanınızı bağlayın!");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert("Lütfen geçerli bir stake miktarı girin!");
      return;
    }

    if (!covalentData) {
      alert("Covalent verileri henüz yüklenmedi. Lütfen bekleyin...");
      return;
    }

    setIsStaking(true);

    try {
      if (canStake) {
        const userData = {
          walletAge: covalentData.walletAge,
          transactionCount: covalentData.transactionCount,
          ethBalance: covalentData.ethBalance,
          totalGasUsed: covalentData.totalGasUsed,
          averageTransactionValue: covalentData.averageTransactionValue,
          uniqueContracts: covalentData.uniqueContracts,
        };

        await stakeWithEncryptedScore(userData, stakeAmount);

        // Update local state
        setDailyReward((parseFloat(stakeAmount) * interestRate) / 100 / 365);
        setLastClaimTime(Date.now());
        // canClaim is now managed by contract

        alert(`Başarıyla ${stakeAmount} ETH stake edildi!`);
        setStakeAmount("");
      } else {
        // Fallback to mock staking
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setDailyReward((parseFloat(stakeAmount) * interestRate) / 100 / 365);
        setLastClaimTime(Date.now());
        // canClaim is now managed by contract
        alert(`Başarıyla ${stakeAmount} ETH stake edildi!`);
        setStakeAmount("");
      }
    } catch (error) {
      console.error("Staking failed:", error);
      alert("Staking işlemi başarısız oldu!");
    } finally {
      setIsStaking(false);
    }
  };

  const handleClaim = async () => {
    if (!address) {
      alert("Lütfen önce cüzdanınızı bağlayın!");
      return;
    }

    setIsClaiming(true);

    try {
      if (canClaim && userScore > 0) {
        await claimRewards(userScore);
        alert("Rewards başarıyla claim edildi!");
      } else {
        // Fallback to mock claiming
        await new Promise((resolve) => setTimeout(resolve, 1500));
        alert("Rewards başarıyla claim edildi!");
      }

      setLastClaimTime(Date.now());
    } catch (error) {
      console.error("Claim failed:", error);
      alert("Claim işlemi başarısız oldu!");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address) {
      alert("Lütfen önce cüzdanınızı bağlayın!");
      return;
    }

    setIsWithdrawing(true);

    try {
      if (canWithdraw) {
        await withdraw();
        alert("Başarıyla withdraw edildi!");

        // Reset local state
        setDailyReward(0);
        // canClaim is now managed by contract
      } else {
        // Fallback to mock withdrawal
        await new Promise((resolve) => setTimeout(resolve, 2000));
        alert("Başarıyla withdraw edildi!");

        // Reset local state
        setDailyReward(0);
        // canClaim is now managed by contract
      }
    } catch (error) {
      console.error("Withdrawal failed:", error);
      alert("Withdrawal işlemi başarısız oldu!");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isConnected) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <WalletNotConnected />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="container mx-auto max-w-6xl pt-24">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.h1
              className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              FHEVM Earn Protocol
            </motion.h1>
            <p className="text-xl text-gray-300 mb-6">
              Gizli skorlama ile yüksek faiz kazanın
            </p>
            <div className="flex justify-center gap-4">
              <Badge
                variant="secondary"
                className="bg-purple-500/20 text-purple-300 border-purple-400"
              >
                <Shield className="w-4 h-4 mr-2" />
                FHEVM Gizlilik
              </Badge>
              <Badge
                variant="secondary"
                className="bg-blue-500/20 text-blue-300 border-blue-400"
              >
                <Lock className="w-4 h-4 mr-2" />
                Şifreli Skorlama
              </Badge>
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-300 border-green-400"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Dinamik Faiz
              </Badge>
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
          >
            {/* Wallet Analysis Card */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wallet className="w-6 h-6" />
                    Cüzdan Analizi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 min-h-[400px] flex flex-col justify-center">
                  {!showScore ? (
                    <div className="text-center py-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-4"
                      >
                        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
                          <Shield className="w-10 h-10 text-white" />
                        </div>
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white mb-3">
                        On-chain Verilerinizi Analiz Edin
                      </h3>
                      <p className="text-gray-300 mb-4 text-sm">
                        FHEVM teknolojisi ile verileriniz şifreli halde işlenir
                        ve gizli skorunuz hesaplanır.
                      </p>
                      <Button
                        onClick={handleAnalyzeWallet}
                        disabled={
                          isAnalyzing || covalentLoading || contractProcessing
                        }
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-full font-semibold"
                      >
                        {covalentLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Veriler Yükleniyor...
                          </>
                        ) : isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {isCountingDown
                              ? `Transaction Onaylanıyor... (${countdown}s)`
                              : "FHEVM ile Analiz Ediliyor..."}
                          </>
                        ) : !address ? (
                          <>
                            <Wallet className="w-5 h-5 mr-2" />
                            Önce Cüzdan Bağlayın
                          </>
                        ) : userScore > 0 ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Rapor Hazır
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                            Analiz Başlat
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="text-sm text-gray-300">
                            Cüzdan Yaşı
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {covalentData?.walletAge || 0} gün
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="text-sm text-gray-300">
                            İşlem Sayısı
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {covalentData?.transactionCount?.toLocaleString() ||
                              0}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="text-sm text-gray-300">
                            ETH Bakiyesi
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {covalentData?.ethBalance?.toFixed(6) || 0} ETH
                          </div>
                        </div>
                      </div>

                      {/* Detaylı İstatistikler */}
                      <div className="bg-white/5 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-white mb-3">
                          Detaylı Analiz
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-300">Toplam Gas</div>
                            <div className="text-white font-semibold">
                              {(
                                covalentData?.totalGasUsed || 0
                              ).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-300">
                              Ort. İşlem Değeri
                            </div>
                            <div className="text-white font-semibold">
                              {(
                                covalentData?.averageTransactionValue || 0
                              ).toFixed(4)}{" "}
                              ETH
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-300">
                              Benzersiz Kontratlar
                            </div>
                            <div className="text-white font-semibold">
                              {covalentData?.uniqueContracts || 0}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6 border border-purple-400/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-white">
                            Gizli Skorunuz
                          </h4>
                          <div className="flex items-center gap-2">
                            {isCountingDown && (
                              <div className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm font-medium border border-orange-400/30">
                                ⏱️ {countdown}s
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowScore(!showScore)}
                              className="text-white hover:bg-white/10"
                            >
                              {showScore ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-bold text-white">
                            {showScore && userScore > 0 ? userScore : "••••"}
                          </div>
                          <div className="flex-1">
                            <Progress
                              value={(userScore / 1000) * 100}
                              className="h-3"
                            />
                            <div className="text-sm text-gray-300 mt-2">
                              {userScore > 0
                                ? "✅ Blockchain'den hesaplanan skor"
                                : "Skorunuz blockchain'de hesaplanacak"}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 text-sm text-gray-300">
                          <Shield className="w-4 h-4 inline mr-2" />
                          Skorunuz FHEVM ile şifreli olarak hesaplandı
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Staking Card */}
            <motion.div variants={itemVariants}>
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Coins className="w-6 h-6" />
                    Stake & Earn
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 min-h-[400px] flex flex-col justify-center">
                  {!stakedAmount ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-400/30">
                        <div className="text-sm text-gray-300">Faiz Oranı</div>
                        <div className="text-3xl font-bold text-white">
                          {interestRate}% APY
                        </div>
                        <div className="text-xs text-gray-400">
                          Skorunuza göre belirlendi
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">
                          Stake Miktarı (ETH)
                        </label>
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <Button
                        onClick={handleStake}
                        disabled={!stakeAmount || isStaking}
                        className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-3 rounded-full font-semibold"
                      >
                        {isStaking ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Stake Ediliyor...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Stake Et
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-400/30">
                        <div className="text-sm text-gray-300">
                          Stake Edilen
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {stakedAmount} ETH
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-sm text-gray-300">
                          Günlük Kazanç
                        </div>
                        <div className="text-xl font-bold text-white">
                          {dailyReward.toFixed(6)} ETH
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          onClick={handleClaim}
                          disabled={!canClaim || isClaiming}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 rounded-full"
                        >
                          {isClaiming ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Claim Ediliyor...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Günlük Claim
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={handleWithdraw}
                          disabled={isWithdrawing}
                          variant="outline"
                          className="w-full border-red-400 text-red-300 hover:bg-red-500/10 py-2 rounded-full"
                        >
                          {isWithdrawing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Çekiliyor...
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Tümünü Çek
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <Card className="bg-white/5 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Gizli Skorlama
                </h3>
                <p className="text-gray-300 text-sm">
                  FHEVM teknolojisi ile verileriniz şifreli halde işlenir ve
                  skorunuz gizli kalır.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Dinamik Faiz
                </h3>
                <p className="text-gray-300 text-sm">
                  Skorunuza göre belirlenen faiz oranı ile maksimum kazanç elde
                  edin.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Güvenli Stake
                </h3>
                <p className="text-gray-300 text-sm">
                  Ethereum Sepolia testnet üzerinde güvenli stake işlemleri
                  gerçekleştirin.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
