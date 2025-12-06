// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import "../test/mocks/MockPoolManager.sol";

contract UpgradeMockPoolManager is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying new MockPoolManager...");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        MockPoolManager newPoolManager = new MockPoolManager();
        console.log("New MockPoolManager:", address(newPoolManager));

        vm.stopBroadcast();

        console.log("\nUpdate .env with:");
        console.log("POOL_MANAGER_ADDRESS=", address(newPoolManager));
    }
}
