// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title CoffeeToken
 * @notice ERC20 token representing tokenized coffee harvest
 * @dev Farmers mint tokens representing their expected harvest
 */
contract CoffeeToken is ERC20 {
    mapping(address => FarmerInfo) public farmers;
    
    struct FarmerInfo {
        int256 latitude;      // GPS latitude * 1e6 (e.g., -18512200 for -18.5122°)
        int256 longitude;     // GPS longitude * 1e6
        uint256 expectedBags; // Expected harvest in bags
        bool registered;
    }
    
    event FarmerRegistered(address indexed farmer, int256 latitude, int256 longitude, uint256 expectedBags);
    event HarvestTokenized(address indexed farmer, uint256 amount);
    
    constructor() ERC20("Coffee Token", "COFFEE") {
        // Mint initial supply for testing
        _mint(msg.sender, 100_000 * 10**18);
    }

    /**
     * @notice Register farmer with GPS coordinates
     * @param latitude GPS latitude * 1e6
     * @param longitude GPS longitude * 1e6
     * @param expectedBags Expected harvest in bags
     */
    function registerFarmer(
        int256 latitude,
        int256 longitude,
        uint256 expectedBags
    ) external {
        require(!farmers[msg.sender].registered, "Already registered");
        require(expectedBags > 0, "Must have expected harvest");
        
        farmers[msg.sender] = FarmerInfo({
            latitude: latitude,
            longitude: longitude,
            expectedBags: expectedBags,
            registered: true
        });
        
        emit FarmerRegistered(msg.sender, latitude, longitude, expectedBags);
    }
    
    /**
     * @notice Mint tokens representing harvest (farmer only)
     * @param amount Amount of tokens to mint
     */
    function tokenizeHarvest(uint256 amount) external {
        require(farmers[msg.sender].registered, "Not registered");
        _mint(msg.sender, amount);
        emit HarvestTokenized(msg.sender, amount);
    }

    /**
     * @notice Mint tokens (for testing/liquidity)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @notice Get farmer's GPS coordinates
     * @param farmer Farmer address
     * @return latitude GPS latitude * 1e6
     * @return longitude GPS longitude * 1e6
     */
    function getFarmerLocation(address farmer) external view returns (int256 latitude, int256 longitude) {
        require(farmers[farmer].registered, "Farmer not registered");
        return (farmers[farmer].latitude, farmers[farmer].longitude);
    }
}
