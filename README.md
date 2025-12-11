# Programmable Society Protocol (PSOC)

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-e6e6e6?logo=solidity)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)
![Foundry](https://img.shields.io/badge/Tested%20with-Foundry-orange)
![Polygon](https://img.shields.io/badge/Network-Polygon-purple)

**Programmable Society Protocol** is an EIP-5192 compliant Soulbound Token (SBT) system designed for decentralized education. It manages the entire lifecycle of a student's on-chain identity, from enrollment (Gray Badge) to graduation (Gold Badge), featuring Role-Based Access Control (RBAC), storage-optimized architecture, and property-based security testing.

## 🌟 Key Features

* **Soulbound Identity (EIP-5192):** Tokens are non-transferable, ensuring the integrity of credentials.
* **Smart Storage Architecture:**
    * **Union Field Layout:** Optimizes gas by sharing storage slots between Faculty (IPFS Hash) and Students (Grades).
    * **Dual Counter System:** Separates global Token IDs from student file mappings. Ensures valid "Gold Badge" metadata (e.g., `1.json`) is only assigned upon certification, preventing metadata gaps.
* **Dynamic Metadata:**
    * **Enrolled:** Students start with a global "Gray Badge" (Gas Optimized).
    * **Certified:** Upon completion, the badge URI dynamically switches to a folder-based mapping (e.g., `.../1.json`) without minting a new token.
* **Role-Based Access Control (RBAC):**
    * **Owner:** Manages Faculty (Teachers/TAs).
    * **Faculty:** Manages Student enrollment and certification.
    * **Student:** Passive receiver with "Right to be Forgotten" (Self-burn).
* **Security First:** Verified with both Unit Tests (Hardhat) and Fuzzing/Invariant Tests (Foundry).

---

## 🛠️ Tech Stack

* **Language:** Solidity v0.8.20
* **Framework:** Hardhat (Deployment) & Foundry (Fuzzing)
* **Testing:** 
    * Chai & Ethers.js (100% Statement Coverage)
    * Forge (Property-based Fuzzing)
* **Network:** Polygon Amoy (Testnet) & Polygon Mainnet
* **Storage:** IPFS (via Pinata)

---

## 🚀 Getting Started

### 1. Prerequisites

* Node.js (v16+)
* [Foundry](https://getfoundry.sh/) (for Fuzz testing)
* MetaMask Wallet (with POL/MATIC)
* Etherscan API Key (V2)

### 2. Installation

```bash
git clone https://github.com/bmhtsx/programmable-society-protocol.git
cd programmable-society-protocol

# Install Node dependencies
npm install

# Install Foundry dependencies
forge install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Your Wallet Private Key (No 0x prefix)
PRIVATE_KEY=your_private_key_here

# Etherscan V2 API Key (For verification on Polygon)
ETHERSCAN_API_KEY=your_etherscan_api_key

# (Optional) Contract Address - Filled after deployment
CONTRACT_ADDRESS=
```

---

## 🧪 Hybrid Testing Suite

This project employs a hybrid testing strategy to ensure both logic correctness and security robustness.

### Unit Testing (Hardhat)
Covers standard logic flows, RBAC, and storage layout.

```bash
npx hardhat test
# Check coverage
npx hardhat coverage
```
> **Status:** 100% Statement Coverage.

### Fuzzing & Invariant Testing (Foundry)
Uses property-based testing to verify security invariants under thousands of random inputs.

**Key Invariants Tested:**
* **Abuse of Power:** Non-faculty addresses can never certify students.
* **Lifecycle Integrity:** Internal IDs (Gold Badge mapping) are *only* assigned after certification.
* **Privilege Degradation:** Revoked Faculty members immediately lose all permissions.

Run Fuzz tests:
```bash
forge test
```

---

## 📦 Deployment & Interaction

### Step 0: Metadata Preparation

Upload your metadata to IPFS (e.g., Pinata):
1.  **Default Gray Badge:** A single image CID.
2.  **Gold Badge Folder:** A folder containing sequential JSONs (`1.json`, `2.json`...).

### Step 1: Deploy Contract

Deploy to Polygon Amoy Testnet.

1.  Open `scripts/deploy.js` and update `DEFAULT_STUDENT_HASH` and `STUDENT_GOLD_FOLDER_HASH` (Raw CIDs).
2.  Run:
    ```bash
    npx hardhat run scripts/deploy.js --network amoy
    ```
3.  **Update `.env`**: Copy the deployed address to `CONTRACT_ADDRESS` in your `.env` file.

### Step 2: Setup Faculty (Owner Only)

Add Teachers and TAs to the system.

1.  Open `scripts/1_setup_faculty.js` to configure addresses.
2.  Run:
    ```bash
    npx hardhat run scripts/1_setup_faculty.js --network amoy
    ```

### Step 3: Enroll Students (Faculty Only)

Batch enroll students. They receive the default Gray Badge.

1.  Open `scripts/2_enroll_students.js` to configure student list.
2.  Run:
    ```bash
    npx hardhat run scripts/2_enroll_students.js --network amoy
    ```

### Step 4: Certify Students (Faculty Only)

Grade a student. This action increments the internal counter and assigns the next available Gold JSON file.

1.  Open `scripts/3_certify_student.js`.
2.  Set `studentTokenId` and `grade`.
3.  Run:
    ```bash
    npx hardhat run scripts/3_certify_student.js --network amoy
    ```

---

## 📜 Contract Architecture

| Role | Permissions | Data Structure (Union Field) |
| :--- | :--- | :--- |
| **Owner** | `addFaculty`, `setFolderHash` | N/A |
| **Faculty** | `enroll`, `certify`, `revoke` | `data` stores **Personal IPFS Hash** |
| **Student** | `burn` (Self-destruct) | `data` stores **Academic Grade** |