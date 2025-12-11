const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not found in .env file");
  }

  const psoc = await hre.ethers.getContractAt("ProgrammableSociety", contractAddress);
  console.log(`Connecting to contract at: ${contractAddress}`);

  // --- 1. CONFIGURATION ---
  
  // Real Addresses for Teachers and TAs
  const facultyAddresses = [
    "0xc148d41a2846c7f84adb008ef0391dc0855293a4" // Teacher Address
  ];
  
  // Personal IPFS CIDs for their specific badges (Profile Pictures)
  // Just the Hash
  const facultyBadges = [
    "bafkreihlcctlx6cirwbkjfdqfuvewzbuamiiivsfwum3jqaeojts44lgfe"
  ];
  
  // Roles: 2 = Teacher, 1 = TA
  const roles = [2]; 

  // --- 2. EXECUTION ---

  console.log(`\nAdding ${facultyAddresses.length} faculty members...`);
  
  const tx = await psoc.addFaculty(facultyAddresses, facultyBadges, roles);
  console.log(`waiting for tx: ${tx.hash}`);
  
  await tx.wait();
  console.log("Faculty added successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});