const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer Address:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.log("\n❌ No Sepolia ETH found!");
    console.log("Please get Sepolia ETH from:");
    console.log("- https://sepoliafaucet.com/");
    console.log("- https://www.infura.io/faucet/sepolia");
    console.log("- https://faucets.chain.link/sepolia");
  } else {
    console.log("\n✅ Sufficient balance for deployment!");
  }
}

main().catch(console.error);
