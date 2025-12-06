// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { AgriHook } from "./AgriHook.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { WeatherOracle } from "./WeatherOracle.sol";

/**
 * @title HookDeployer
 * @notice Helper contract to deploy AgriHook with CREATE2 for valid address
 */
contract HookDeployer {
    /**
     * @notice Deploy AgriHook with a specific salt
     * @param poolManager Pool manager address
     * @param oracle Weather oracle address
     * @param salt Salt for CREATE2
     * @return hook Deployed hook address
     */
    function deploy(
        IPoolManager poolManager,
        WeatherOracle oracle,
        bytes32 salt
    ) external returns (AgriHook hook) {
        hook = new AgriHook{salt: salt}(poolManager, oracle);
    }
    
    /**
     * @notice Compute the address for a given salt
     * @param poolManager Pool manager address
     * @param oracle Weather oracle address
     * @param salt Salt for CREATE2
     * @return predicted Predicted address
     */
    function computeAddress(
        IPoolManager poolManager,
        WeatherOracle oracle,
        bytes32 salt
    ) external view returns (address predicted) {
        bytes memory creationCode = abi.encodePacked(
            type(AgriHook).creationCode,
            abi.encode(poolManager, oracle)
        );
        bytes32 creationCodeHash = keccak256(creationCode);
        
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            creationCodeHash
        )))));
    }
}
