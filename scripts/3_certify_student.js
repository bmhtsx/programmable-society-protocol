const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x8aec7e86fce597E546EC85Eea2FA8F197a464620";
  const psoc = await hre.ethers.getContractAt("ProgrammableSociety", CONTRACT_ADDRESS);

  const studentTokenId = 2;
  const grade = "Good job!";
  const uniqueGoldBadge = "bafkreibum5c7v6pgrndlkoxdjgiansptvwhqnd6reaf6cucpjau6w4mpom";

  console.log(`Certifying Student ID: ${studentTokenId}...`);

  const tx = await psoc.certifyStudent(studentTokenId, grade, uniqueGoldBadge);
  console.log(`Transaction sent: ${tx.hash}`);

  await tx.wait();
  console.log("Student Certified! Metadata updated to Gold Badge.");
}

main().catch(console.error);