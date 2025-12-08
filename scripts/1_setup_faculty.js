const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x8aec7e86fce597E546EC85Eea2FA8F197a464620";
  const psoc = await hre.ethers.getContractAt("ProgrammableSociety", CONTRACT_ADDRESS);

  const facultyAddresses = ["0xc148d41a2846c7f84adb008ef0391dc0855293a4"];
  const facultyBadges = ["bafkreig56vlscdfwjolr7jzgrxwppgowsfe2fn4ucvoaxqihs4zko2ekn4"];
  const roles = [2]; // 2=Teacher

  console.log(`Adding ${facultyAddresses.length} faculty members...`);

  const tx = await psoc.addFaculty(facultyAddresses, facultyBadges, roles);
  console.log(`Transaction sent: ${tx.hash}`);
  
  await tx.wait();
  console.log("Faculty added successfully!");
}

main().catch(console.error);