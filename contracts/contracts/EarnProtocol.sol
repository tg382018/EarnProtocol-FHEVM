// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Earn Protocol with FHEVM encrypted scoring
/// @author EarnProtocol-FHEVM
/// @notice A contract that calculates encrypted scores based on user wallet data
contract EarnProtocol is SepoliaConfig {
    // Encrypted score storage
    euint64 private _userScore;
    
    // State variables for staking
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public totalEarned;
    mapping(address => bool) public hasStaked;
    mapping(address => bool) public hasCalculatedScore; // Track if user has calculated score
    mapping(address => uint256) public userPlainScore; // Store plain score for quick access
    
    // Global variables
    uint256 public totalStaked;
    uint256 public contractBalance;
    
    // Events
    event ScoreCalculated(address indexed user, uint256 score);
    event Staked(address indexed user, uint256 amount, uint256 score);
    event RewardsClaimed(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    // Owner functions
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /// @notice Calculate encrypted score based on wallet data
    /// @param walletAge encrypted wallet age in days
    /// @param transactionCount encrypted transaction count
    /// @param ethBalance encrypted ETH balance (scaled by 1e6)
    /// @param totalGasUsed encrypted total gas used
    /// @param averageTxValue encrypted average transaction value (scaled by 1e6)
    /// @param uniqueContracts encrypted unique contracts count
    /// @param inputProof the input proof
    /// @return The calculated encrypted score
    function calculateEncryptedScore(
        externalEuint64 walletAge,
        externalEuint64 transactionCount,
        externalEuint64 ethBalance,
        externalEuint64 totalGasUsed,
        externalEuint64 averageTxValue,
        externalEuint64 uniqueContracts,
        bytes calldata inputProof
    ) external returns (euint64) {
        // Convert external encrypted inputs to internal euint64
        euint64 encryptedWalletAge = FHE.fromExternal(walletAge, inputProof);
        euint64 encryptedTransactionCount = FHE.fromExternal(transactionCount, inputProof);
        euint64 encryptedEthBalance = FHE.fromExternal(ethBalance, inputProof);
        euint64 encryptedTotalGasUsed = FHE.fromExternal(totalGasUsed, inputProof);
        euint64 encryptedAverageTxValue = FHE.fromExternal(averageTxValue, inputProof);
        euint64 encryptedUniqueContracts = FHE.fromExternal(uniqueContracts, inputProof);
        
        // Calculate encrypted score using simple weighted formula
        euint64 score = FHE.asEuint64(0);
        
        // Add weighted components (simplified for FHEVM compatibility)
        score = FHE.add(score, encryptedWalletAge);
        score = FHE.add(score, encryptedTransactionCount);
        score = FHE.add(score, encryptedEthBalance);
        score = FHE.add(score, encryptedTotalGasUsed);
        score = FHE.add(score, encryptedAverageTxValue);
        score = FHE.add(score, encryptedUniqueContracts);
        
        // Store the encrypted score
        _userScore = score;
        
        // Allow access to the encrypted score
        FHE.allowThis(_userScore);
        FHE.allow(_userScore, msg.sender);
        
        emit ScoreCalculated(msg.sender, 0); // We can't emit the actual encrypted score
        
        return _userScore;
    }
    
    /// @notice Get the current encrypted score
    /// @return The current encrypted score
    function getEncryptedScore() external view returns (euint64) {
        return _userScore;
    }
    
    /// @notice Stake with encrypted score calculation
    /// @param walletAge encrypted wallet age
    /// @param transactionCount encrypted transaction count
    /// @param ethBalance encrypted ETH balance
    /// @param totalGasUsed encrypted total gas used
    /// @param averageTxValue encrypted average transaction value
    /// @param uniqueContracts encrypted unique contracts count
    /// @param inputProof the input proof
    function stakeWithEncryptedScore(
        externalEuint64 walletAge,
        externalEuint64 transactionCount,
        externalEuint64 ethBalance,
        externalEuint64 totalGasUsed,
        externalEuint64 averageTxValue,
        externalEuint64 uniqueContracts,
        bytes calldata inputProof
    ) external payable {
        require(msg.value > 0, "Stake amount must be greater than 0");
        
        // Calculate encrypted score (inline calculation)
        // Convert external encrypted inputs to internal euint64
        euint64 encryptedWalletAge = FHE.fromExternal(walletAge, inputProof);
        euint64 encryptedTransactionCount = FHE.fromExternal(transactionCount, inputProof);
        euint64 encryptedEthBalance = FHE.fromExternal(ethBalance, inputProof);
        euint64 encryptedTotalGasUsed = FHE.fromExternal(totalGasUsed, inputProof);
        euint64 encryptedAverageTxValue = FHE.fromExternal(averageTxValue, inputProof);
        euint64 encryptedUniqueContracts = FHE.fromExternal(uniqueContracts, inputProof);
        
        // Calculate encrypted score using simple weighted formula
        euint64 score = FHE.asEuint64(0);
        
        // Add weighted components (simplified for FHEVM compatibility)
        score = FHE.add(score, encryptedWalletAge);
        score = FHE.add(score, encryptedTransactionCount);
        score = FHE.add(score, encryptedEthBalance);
        score = FHE.add(score, encryptedTotalGasUsed);
        score = FHE.add(score, encryptedAverageTxValue);
        score = FHE.add(score, encryptedUniqueContracts);
        
        // Store the encrypted score
        _userScore = score;
        
        // Allow access to the encrypted score
        FHE.allowThis(_userScore);
        FHE.allow(_userScore, msg.sender);
        
        // Update user data
        stakedAmount[msg.sender] += msg.value;
        lastClaimTime[msg.sender] = block.timestamp;
        hasStaked[msg.sender] = true;
        
        // Update global data
        totalStaked += msg.value;
        contractBalance += msg.value;
        
        emit Staked(msg.sender, msg.value, 0); // We can't emit the actual score
    }
    
    /// @notice Calculate score based on plain data (for testing)
    /// @param walletAge wallet age in days
    /// @param transactionCount transaction count
    /// @param ethBalance ETH balance (scaled by 1e6)
    /// @param totalGasUsed total gas used
    /// @param averageTxValue average transaction value (scaled by 1e6)
    /// @param uniqueContracts unique contracts count
    /// @return The calculated score
    function calculatePlainScore(
        uint256 walletAge,
        uint256 transactionCount,
        uint256 ethBalance,
        uint256 totalGasUsed,
        uint256 averageTxValue,
        uint256 uniqueContracts
    ) external returns (uint256) {
        // Calculate score using weighted formula
        uint256 score = 0;
        
        // Wallet age (max 200 points) - 1 year = 100 points
        score += (walletAge * 27) / 100;
        if (score > 200) score = 200;
        
        // Transaction count (max 300 points) - 100 tx = 100 points
        if (transactionCount > 300) transactionCount = 300;
        score += transactionCount;
        
        // ETH balance (max 200 points) - 1 ETH = 100 points
        uint256 ethScore = (ethBalance * 100) / 1e6;
        if (ethScore > 200) ethScore = 200;
        score += ethScore;
        
        // Gas usage (max 150 points) - 1M gas = 50 points
        uint256 gasScore = totalGasUsed / 20000;
        if (gasScore > 150) gasScore = 150;
        score += gasScore;
        
        // Average transaction value (max 100 points) - 0.1 ETH = 50 points
        uint256 avgTxScore = (averageTxValue * 500) / 1e6;
        if (avgTxScore > 100) avgTxScore = 100;
        score += avgTxScore;
        
        // Unique contracts (max 50 points) - 10 contracts = 25 points
        uint256 contractScore = (uniqueContracts * 25) / 10;
        if (contractScore > 50) contractScore = 50;
        score += contractScore;
        
        // Cap at 1000
        if (score > 1000) score = 1000;
        
        // Store the score (for now, we'll store it as plain uint256)
        // In real FHEVM, this would be encrypted
        // _userScore = FHE.asEuint64(score);
        
        // Mark that user has calculated score and store it
        hasCalculatedScore[msg.sender] = true;
        userPlainScore[msg.sender] = score;
        
        emit ScoreCalculated(msg.sender, score);
        
        return score;
    }

    /// @notice Check if user has already calculated score
    /// @param user The user address to check
    /// @return hasCalculated True if user has calculated score
    /// @return score The user's score if calculated, 0 otherwise
    function getUserScoreStatus(address user) external view returns (bool hasCalculated, uint256 score) {
        return (hasCalculatedScore[user], userPlainScore[user]);
    }

    /// @notice Calculate interest rate based on score (public function for frontend)
    /// @param score The decrypted score from frontend
    /// @return The interest rate in basis points (100 = 1%)
    function calculateInterestRate(uint256 score) public pure returns (uint256) {
        if (score >= 900) return 1500; // 15%
        if (score >= 800) return 1250; // 12.5%
        if (score >= 700) return 1000; // 10%
        if (score >= 600) return 800;  // 8%
        if (score >= 500) return 600;  // 6%
        return 400; // 4%
    }
    
    /// @notice Claim rewards based on decrypted score
    /// @param userScore The decrypted score from frontend
    function claimRewards(uint256 userScore) external {
        require(hasStaked[msg.sender], "No stake found");
        require(block.timestamp >= lastClaimTime[msg.sender] + 24 hours, "Wait 24 hours");
        
        // Calculate interest rate based on score
        uint256 interestRate = calculateInterestRate(userScore);
        
        // Calculate daily reward
        uint256 dailyReward = (stakedAmount[msg.sender] * interestRate) / 10000;
        
        // Check if contract has enough balance
        require(address(this).balance >= dailyReward, "Insufficient contract balance");
        
        // Update claim time
        lastClaimTime[msg.sender] = block.timestamp;
        totalEarned[msg.sender] += dailyReward;
        
        // Transfer reward
        payable(msg.sender).transfer(dailyReward);
        
        emit RewardsClaimed(msg.sender, dailyReward);
    }
    
    /// @notice Withdraw all staked amount
    function withdraw() external {
        require(hasStaked[msg.sender], "No stake found");
        require(stakedAmount[msg.sender] > 0, "No amount to withdraw");
        
        uint256 amount = stakedAmount[msg.sender];
        
        // Update state
        totalStaked -= amount;
        contractBalance -= amount;
        stakedAmount[msg.sender] = 0;
        hasStaked[msg.sender] = false;
        
        // Transfer funds
        payable(msg.sender).transfer(amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /// @notice View user data
    /// @param user The user address
    /// @return _stakedAmount The staked amount
    /// @return _lastClaimTime The last claim time
    /// @return _totalEarned The total earned amount
    /// @return _hasStaked Whether user has staked
    function getUserData(address user) external view returns (
        uint256 _stakedAmount,
        uint256 _lastClaimTime,
        uint256 _totalEarned,
        bool _hasStaked
    ) {
        return (
            stakedAmount[user],
            lastClaimTime[user],
            totalEarned[user],
            hasStaked[user]
        );
    }
    
    /// @notice Check if user can claim rewards
    /// @param user The user address
    /// @return Whether user can claim
    function canClaim(address user) external view returns (bool) {
        if (!hasStaked[user]) return false;
        return block.timestamp >= lastClaimTime[user] + 24 hours;
    }
    
    /// @notice Owner function to update contract balance
    function updateContractBalance() external onlyOwner {
        contractBalance = address(this).balance;
    }
    
    /// @notice Owner function to withdraw contract balance
    function withdrawContractBalance() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /// @notice Receive ETH
    receive() external payable {
        contractBalance += msg.value;
    }
}