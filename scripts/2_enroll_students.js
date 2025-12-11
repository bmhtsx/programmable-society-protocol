const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not found in .env file");
  }

  // Get the signer (Faculty) from .env PRIVATE_KEY
  const [signer] = await hre.ethers.getSigners();
  const psoc = await hre.ethers.getContractAt("ProgrammableSociety", contractAddress, signer);
  
  console.log(`Acting as Faculty: ${signer.address}`);
  console.log(`Connecting to contract at: ${contractAddress}`);

  // --- 1. CONFIGURATION ---

  // Addresses of students to enroll
  const newStudents = [
    "0x8c0ea2488cf944e00f5763be54fe38c67ee4b31d"
  ];

  // --- 2. EXECUTION ---

  console.log(`\nEnrolling ${newStudents.length} students...`);
  console.log("They will receive the default GRAY badge.");

  const tx = await psoc.enrollStudents(newStudents);
  console.log(`waiting for tx: ${tx.hash}`);

  await tx.wait();
  console.log("Students enrolled successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});