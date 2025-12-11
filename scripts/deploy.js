const hre = require("hardhat");

async function main() {
  // 1. Configuration
  // IMPORTANT: Enter ONLY the CID (Hash). Do NOT add "ipfs://" or "/"
  
  const DEFAULT_STUDENT_HASH = "bafkreidfeldmrvqoqgcwoozmnrjxsir4nhyw7leemiwucla3wjym43aeei"; 
  const STUDENT_GOLD_FOLDER_HASH = "bafybeibwbyrz6waio5szeo2xpmyfdmsd4testn4ib5uhjififpcnc5u6we"; 

  console.log("Starting deployment...");

  // 2. Deploy Contract
  const psoc = await hre.ethers.deployContract("ProgrammableSociety", [
    DEFAULT_STUDENT_HASH,
    STUDENT_GOLD_FOLDER_HASH
  ]);
  await psoc.waitForDeployment();

  const address = await psoc.getAddress();
  console.log(`Contract deployed to: ${address}`);
  console.log(`Default Hash: ${DEFAULT_STUDENT_HASH}`);
  console.log(`Gold Folder:  ${STUDENT_GOLD_FOLDER_HASH}`);

  // 3. Auto-Verify
  if (network.name === "amoy" || network.name === "polygon") {
    console.log("Waiting for 6 block confirmations...");
    await psoc.deploymentTransaction().wait(6);
    
    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [DEFAULT_STUDENT_HASH, STUDENT_GOLD_FOLDER_HASH],
      });
      console.log("Verified successfully!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});