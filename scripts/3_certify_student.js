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

  // The Token ID of the student you want to certify.
  // Tip: Check PolygonScan to find the ID
  const studentTokenId = 3; 
  
  // The final grade/result to record on-chain
  const grade = "Distinction";

  // --- 2. EXECUTION ---

  console.log(`\nCertifying Student Token ID: ${studentTokenId}...`);
  console.log(`Grade: ${grade}`);
  console.log("Metadata will automatically switch to the next available JSON in the Gold Folder.");

  const tx = await psoc.certifyStudent(studentTokenId, grade);
  console.log(`waiting for tx: ${tx.hash}`);

  await tx.wait();
  console.log("Student Certified! Status updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});