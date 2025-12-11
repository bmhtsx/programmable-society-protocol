
require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    amoy: { // Polygon testnet
      url: "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 5000000,
      gasPrice: 50000000000,
    },
    polygon: { // Polygon mainnet
      url: "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.ETHERSCAN_API_KEY,
      polygonAmoy: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=80002",
          browserURL: "https://amoy.polygonscan.com"
        }
      },
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=137",
          browserURL: "https://polygonscan.com"
        }
      }
    ]
  }
};