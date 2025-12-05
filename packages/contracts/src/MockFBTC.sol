// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockFBTC
 * @notice Mock FAsset Bitcoin for testing on Flare Network
 * @dev Standard ERC20 with 18 decimals and public mint function
 * 
 * FAssets are tokenized representations of non-smart contract tokens
 * on the Flare Network. This mock represents Bitcoin (BTC) as an FAsset.
 */
contract MockFBTC is ERC20 {
    /**
     * @notice Constructor to initialize the FAsset Bitcoin token
     */
    constructor() ERC20("FAsset Bitcoin", "FBTC") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10**18); // 1M FBTC
    }

    /**
     * @notice Mint tokens to any address (for testing/faucet)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Faucet function for easy testing
     * @dev Mints 100 FBTC to the caller
     */
    function faucet() external {
        _mint(msg.sender, 100 * 10**18); // 100 FBTC
    }

    /**
     * @notice Get the number of decimals
     * @return Number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
