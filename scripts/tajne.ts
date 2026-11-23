import { network } from "hardhat";

const { ethers } = await network.connect();
const token = await ethers.deployContract("CoworkingBodovi");
await token.waitForDeployment();
const adresa = await token.getAddress();

// Čitamo pohranu ugovora, slot po slot.
for (let slot: number = 0; slot < 6; slot++) {
  const vrijednost = await ethers.provider.getStorage(adresa, slot);
  console.log(`slot ${slot}: ${vrijednost}`);
}
