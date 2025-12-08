# Programmable Society Protocol (PSOC)

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-e6e6e6?logo=solidity)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)
![Polygon](https://img.shields.io/badge/Network-Polygon-purple)

**Programmable Society Protocol** is an EIP-5192 compliant Soulbound Token (SBT) system designed for decentralized education. It manages the entire lifecycle of a student's on-chain identity, from enrollment (Gray Badge) to graduation (Gold Badge), featuring Role-Based Access Control (RBAC) and dynamic metadata updates.

## 🌟 Key Features

* **Soulbound Identity (EIP-5192):** Tokens are non-transferable, ensuring the integrity of the credentials.
* **Dynamic Metadata:**
    * **Enrolled:** Students start with a global "Gray Badge" (Gas Optimized).
    * **Certified:** Upon completion, the badge dynamically updates to a unique "Gold Badge" without minting a new token.
* **Role-Based Access Control (RBAC):**
    * **Owner:** Manages Faculty (Teachers/TAs).
    * **Faculty:** Manages Student enrollment and certification.
    * **Student:** Passive receiver, with "Right to be Forgotten" (Self-burn).
* **Gas Efficiency:** Uses a "Global Default, Local Override" pattern to minimize storage costs for enrollment.
* **Lifecycle Management:** Supports `Burn` (User) and `Revoke` (Faculty) functionalities.

---

## 🛠️ Tech Stack

* **Language:** Solidity v0.8.20
* **Framework:** Hardhat
* **Testing:** Chai & Ethers.js (100% Statement Coverage)
* **Network:** Polygon Amoy (Testnet) & Polygon Mainnet
* **Storage:** IPFS (via Pinata)

---

## 🚀 Getting Started

### 1. Prerequisites

* Node.js (v16+)
* MetaMask Wallet (with some POL/MATIC for gas)
* Etherscan API Key (V2)

### 2. Installation

```bash
git clone [https://github.com/your-username/programmable-society-protocol.git](https://github.com/your-username/programmable-society-protocol.git)
cd programmable-society-protocol
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Your Wallet Private Key (No 0x prefix)
PRIVATE_KEY=your_private_key_here

# Etherscan V2 API Key (For verification on Polygon)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

---

## 🧪 Testing

The project includes a comprehensive test suite covering RBAC, SBT logic, and Dynamic Metadata.

Run unit tests:
```bash
npx hardhat test
```

Generate coverage report:
```bash
npx hardhat coverage
```
> **Note:** The protocol achieves high test coverage, including Branch Coverage for RBAC logic.

---

## 📦 Deployment & Interaction

### Step 0: Metadata Preparation (Important)

Before deploying, ensure you have uploaded your JSON metadata to IPFS (e.g., via Pinata).
* **Default Hash:** The CID of the JSON file for the "Gray/Enrolled" badge.

### Step 1: Deploy Contract

Deploy to Polygon Amoy Testnet.

```bash
# Open scripts/deploy.js and update DEFAULT_STUDENT_HASH first!
npx hardhat run scripts/deploy.js --network amoy
```
*Copy the deployed contract address after success.*

### Step 2: Setup Faculty (Owner Only)

Add Teachers and TAs to the system.

1.  Open `scripts/1_setup_faculty.js`.
2.  Update `CONTRACT_ADDRESS`, `facultyAddresses`, and `facultyBadges`.
3.  Run:
    ```bash
    npx hardhat run scripts/1_setup_faculty.js --network amoy
    ```

### Step 3: Enroll Students (Faculty Only)

Batch enroll students. They will receive the default Gray Badge.

1.  Open `scripts/2_enroll_students.js`.
2.  Update `CONTRACT_ADDRESS` and `newStudents`.
3.  Run:
    ```bash
    npx hardhat run scripts/2_enroll_students.js --network amoy
    ```

### Step 4: Certify Students (Faculty Only)

Grade a student and upgrade their badge to Gold.

1.  Open `scripts/3_certify_student.js`.
2.  Update `studentTokenId`, `grade`, and `uniqueGoldBadge` (JSON CID).
3.  Run:
    ```bash
    npx hardhat run scripts/3_certify_student.js --network amoy
    ```

---

## 📜 Contract Architecture

| Role | Permissions |
| :--- | :--- |
| **Owner** | `addFaculty` |
| **Faculty** | `enrollStudents`, `certifyStudent`, `revoke` |
| **Student** | `burn` (Self-destruct) |
| **Public** | `tokenURI` (View Metadata), `profiles` (View Status) |
