const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x8aec7e86fce597E546EC85Eea2FA8F197a464620";
  const psoc = await hre.ethers.getContractAt("ProgrammableSociety", CONTRACT_ADDRESS);

  const newStudents = ["0x8c0ea2488cf944e00f5763be54fe38c67ee4b31d"];

  console.log(`Enrolling ${newStudents.length} students with default badge...`);

  // IMPORTANT: Ensure your .env PRIVATE_KEY belongs to a Faculty member (Teacher/TA)
  const tx = await psoc.enrollStudents(newStudents);
  console.log(`Transaction sent: ${tx.hash}`);

  await tx.wait();
  console.log("Students enrolled successfully!");
}

main().catch(console.error);