const hre = require("hardhat");

async function main() {
  // 1. Configuration: The default "Gray/Enrolled" badge IPFS hash
  const DEFAULT_STUDENT_HASH = "bafkreidod54srku2rxhdtrfjynbrvqqmpatrl422voi5vfoo5v74d5id5a"; 

  console.log("Starting deployment...");

  // 2. Deploy Contract
  const psoc = await hre.ethers.deployContract("ProgrammableSociety", [DEFAULT_STUDENT_HASH]);
  await psoc.waitForDeployment();

  const address = await psoc.getAddress();
  console.log(`Contract deployed to: ${address}`);
  console.log(`Default Student Hash set to: ${DEFAULT_STUDENT_HASH}`);

  // 3. Verify on PolygonScan (only if on public network)
  if (network.name === "amoy" || network.name === "polygon") {
    console.log("Waiting for 6 block confirmations...");
    await psoc.deploymentTransaction().wait(6);
    
    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [DEFAULT_STUDENT_HASH],
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