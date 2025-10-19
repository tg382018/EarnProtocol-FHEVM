const hre = require("hardhat");

async function main() {
  console.log("Deploying EarnProtocol contract...");

  // Get the contract factory
  const EarnProtocol = await hre.ethers.getContractFactory("EarnProtocol");

  // Deploy the contract
  const earnProtocol = await EarnProtocol.deploy();

  // Wait for deployment to complete
  await earnProtocol.waitForDeployment();

  const contractAddress = await earnProtocol.getAddress();
  
  console.log("EarnProtocol deployed to:", contractAddress);
  console.log("Contract address:", contractAddress);
  
  // Save contract address to .env file
  console.log("\nAdd this to your .env.local file:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });