// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

/**
 * @title SaveDeployment
 * @notice Helper script to save deployment addresses to JSON
 * @dev Run after DeployCoston2 to extract addresses from broadcast logs
 */
contract SaveDeployment is Script {
    function run() external view {
        // Read the latest deployment from broadcast folder
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/broadcast/DeployCoston2.s.sol/114/run-latest.json");
        
        console.log("Reading deployment from:", path);
        console.log("");
        console.log("To save addresses, parse the broadcast JSON file:");
        console.log("jq '.transactions[] | select(.contractName != null) | {name: .contractName, address: .contractAddress}' broadcast/DeployCoston2.s.sol/114/run-latest.json");
    }
}
