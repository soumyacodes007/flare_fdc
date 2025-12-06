// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import { IFtsoRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/IFtsoRegistry.sol";
import { WeatherOracle } from "./WeatherOracle.sol";

/**
 * @title WeatherOracleWithFTSO
 * @notice Enhanced WeatherOracle with FTSO price feed integration
 * @dev Extends WeatherOracle with real-time FTSO price updates
 */
contract WeatherOracleWithFTSO is WeatherOracle {
    // FTSO Configuration
    string public ftsoSymbol;              // Symbol to track (e.g., "BTC", "ETH")
    uint256 public ftsoToCoffeeRatio;      // Conversion ratio (e.g., 10000 = 1 BTC = 10000 bags)
    bool public useFTSO;                   // Enable/disable FTSO updates

    event FTSOConfigUpdated(string symbol, uint256 ratio, bool enabled);
    event FTSOPriceUpdated(uint256 ftsoPrice, uint256 coffeePrice, uint256 timestamp);

    constructor(uint256 _basePrice) WeatherOracle(_basePrice) {
        // Default FTSO configuration (BTC as proxy)
        ftsoSymbol = "BTC";
        ftsoToCoffeeRatio = 10000; // 1 BTC = 10,000 bags of coffee
        useFTSO = false; // Disabled by default
    }

    /**
     * @notice Configure FTSO integration
     * @param _symbol FTSO symbol to track (e.g., "BTC", "ETH", "XRP")
     * @param _ratio Conversion ratio (e.g., 10000 = 1 BTC = 10000 bags)
     * @param _enabled Enable/disable FTSO updates
     */
    function configureFTSO(
        string memory _symbol,
        uint256 _ratio,
        bool _enabled
    ) external onlyOwner {
        require(_ratio > 0, "Ratio must be positive");
        
        ftsoSymbol = _symbol;
        ftsoToCoffeeRatio = _ratio;
        useFTSO = _enabled;
        
        emit FTSOConfigUpdated(_symbol, _ratio, _enabled);
    }

    /**
     * @notice Update base price from FTSO
     * @dev Fetches price from FTSO Registry and converts to coffee price
     */
    function updatePriceFromFTSO() external {
        require(useFTSO, "FTSO not enabled");
        
        IFtsoRegistry registry = IFtsoRegistry(ContractRegistry.getFtsoRegistry());
        
        // Get current price with decimals
        (uint256 ftsoPrice, uint256 timestamp, uint256 decimals) = 
            registry.getCurrentPriceWithDecimals(ftsoSymbol);
        
        require(ftsoPrice > 0, "Invalid FTSO price");
        require(timestamp > block.timestamp - 5 minutes, "Price too old");
        
        // Convert FTSO price to coffee price
        // Formula: coffeePrice = (ftsoPrice * 10^18) / (ratio * 10^decimals)
        uint256 coffeePrice = (ftsoPrice * 10**18) / (ftsoToCoffeeRatio * 10**decimals);
        
        require(coffeePrice > 0, "Invalid coffee price");
        
        basePrice = coffeePrice;
        
        emit FTSOPriceUpdated(ftsoPrice, coffeePrice, timestamp);
        emit BasePriceUpdated(coffeePrice, timestamp);
    }

    /**
     * @notice Get available FTSO symbols
     * @return Array of supported symbol strings
     */
    function getAvailableFTSOSymbols() external view returns (string[] memory) {
        IFtsoRegistry registry = IFtsoRegistry(ContractRegistry.getFtsoRegistry());
        return registry.getSupportedSymbols();
    }

    /**
     * @notice Get current FTSO price for configured symbol
     * @return price Current FTSO price
     * @return timestamp Price timestamp
     * @return decimals Price decimals
     */
    function getCurrentFTSOPrice() external view returns (
        uint256 price,
        uint256 timestamp,
        uint256 decimals
    ) {
        IFtsoRegistry registry = IFtsoRegistry(ContractRegistry.getFtsoRegistry());
        return registry.getCurrentPriceWithDecimals(ftsoSymbol);
    }


}
