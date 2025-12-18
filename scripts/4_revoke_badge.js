const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not found in .env file");
  }

  const [signer] = await hre.ethers.getSigners();
  const psoc = await hre.ethers.getContractAt("ProgrammableSociety", contractAddress, signer);

  console.log(`Acting as Faculty: ${signer.address}`);

  // --- 1. CONFIGURATION ---

  const tokenIdToRevoke = 2;

  // --- 2. EXECUTION ---

  console.log(`\nRevoking (Burning) Token ID: ${tokenIdToRevoke}...`);
  console.log("Warning: This action is permanent and cannot be undone.");

  try {
    const tx = await psoc.revoke(tokenIdToRevoke);
    
    console.log(`Transaction sent: ${tx.hash}`);
    console.log("Waiting for confirmation...");

    await tx.wait();
    
    console.log(`Token #${tokenIdToRevoke} has been successfully revoked.`);
    console.log("The student no longer holds this badge.");

  } catch (error) {
    if (error.message.includes("Caller is not Faculty")) {
      console.error("\nFAILED: Permission Denied.");
      console.error("Your wallet address is NOT a Faculty member (Teacher/TA).");
    } else if (error.message.includes("owner query for nonexistent token")) {
      console.error("\nFAILED: Token does not exist.");
      console.error("Please check if the Token ID is correct.");
    } else {
      console.error("\nTransaction failed:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});