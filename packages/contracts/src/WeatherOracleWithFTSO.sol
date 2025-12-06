// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import { IFtsoRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/IFtsoRegistry.sol";
import { IWeb2Json } from "./interfaces/flare/IWeb2Json.sol";
import { IFdcVerificationExtended } from "./interfaces/flare/IFdcVerificationExtended.sol";

/**
 * @title WeatherOracleWithFTSO
 * @notice Enhanced WeatherOracle with FTSO price feed integration
 * @dev Extends WeatherOracle with real-time FTSO price updates
 */
contract WeatherOracleWithFTSO {
    // Weather event types
    enum WeatherEventType {
        NONE,
        DROUGHT,
        FROST,
        FLOOD,
        HEATWAVE,
        STORM
    }

    struct WeatherEvent {
        WeatherEventType eventType;
        int256 priceImpactPercent;
        uint256 timestamp;
        bool active;
    }

    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }

    struct WeatherData {
        uint256 rainfall;
        int256 temperature;
        int256 soilMoisture;
        int256 latitude;
        int256 longitude;
        uint256 timestamp;
    }

    uint256 public basePrice;
    WeatherEvent public currentWeatherEvent;
    address public owner;

    // FTSO Configuration
    string public ftsoSymbol;              // Symbol to track (e.g., "BTC", "ETH")
    uint256 public ftsoToCoffeeRatio;      // Conversion ratio (e.g., 10000 = 1 BTC = 10000 bags)
    bool public useFTSO;                   // Enable/disable FTSO updates

    // Weather multipliers
    uint256 public constant SEVERE_DROUGHT_MULTIPLIER = 150;
    uint256 public constant MODERATE_DROUGHT_MULTIPLIER = 130;
    uint256 public constant MILD_DROUGHT_MULTIPLIER = 115;

    event DisruptionUpdated(WeatherEventType indexed eventType, int256 priceImpactPercent, uint256 timestamp);
    event DisruptionCleared(uint256 timestamp);
    event BasePriceUpdated(uint256 newPrice, uint256 timestamp);
    event FTSOConfigUpdated(string symbol, uint256 ratio, bool enabled);
    event FTSOPriceUpdated(uint256 ftsoPrice, uint256 coffeePrice, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    constructor(uint256 _basePrice) {
        owner = msg.sender;
        basePrice = _basePrice;
        
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

    /**
     * @notice Get theoretical price with weather adjustment
     * @return Adjusted price in 18 decimals
     */
    function getTheoreticalPrice() external view returns (uint256) {
        if (!currentWeatherEvent.active) {
            return basePrice;
        }

        int256 adjustedPrice = int256(basePrice) * (100 + currentWeatherEvent.priceImpactPercent) / 100;
        require(adjustedPrice > 0, "Invalid price calculation");

        return uint256(adjustedPrice);
    }

    /**
     * @notice Calculate weather multiplier from rainfall data
     * @param rainfall Rainfall in mm (last 7 days)
     * @return multiplier Price multiplier percentage
     */
    function calculateWeatherMultiplier(uint256 rainfall) public pure returns (uint256) {
        if (rainfall == 0) {
            return SEVERE_DROUGHT_MULTIPLIER;
        } else if (rainfall < 5) {
            return MODERATE_DROUGHT_MULTIPLIER;
        } else if (rainfall < 10) {
            return MILD_DROUGHT_MULTIPLIER;
        } else {
            return 100;
        }
    }

    /**
     * @notice Update base price using FDC price attestation
     * @param proof FDC Web2Json proof containing price data
     */
    function updateBasePriceWithFDC(IWeb2Json.Proof calldata proof) external {
        require(isWeb2JsonProofValid(proof), "Invalid FDC proof");

        PriceData memory priceData = abi.decode(
            proof.data.responseBody.abiEncodedData,
            (PriceData)
        );

        require(priceData.price > 0, "Base price must be positive");
        require(priceData.timestamp <= block.timestamp, "Future timestamp not allowed");
        require(priceData.timestamp > block.timestamp - 1 hours, "Price data too old");

        basePrice = priceData.price;
        emit BasePriceUpdated(priceData.price, priceData.timestamp);
    }

    /**
     * @notice Set weather disruption using FDC weather attestation
     * @param proof FDC Web2Json proof containing weather data
     */
    function setWeatherDisruptionWithFDC(IWeb2Json.Proof calldata proof) external {
        require(isWeb2JsonProofValid(proof), "Invalid FDC proof");

        WeatherData memory weatherData = abi.decode(
            proof.data.responseBody.abiEncodedData,
            (WeatherData)
        );

        require(weatherData.timestamp <= block.timestamp, "Future timestamp not allowed");
        require(weatherData.timestamp > block.timestamp - 1 hours, "Weather data too old");

        uint256 multiplier = calculateWeatherMultiplier(weatherData.rainfall);
        int256 impactPercent = int256(multiplier) - 100;

        WeatherEventType eventType;
        if (weatherData.rainfall < 10) {
            eventType = WeatherEventType.DROUGHT;
        } else {
            eventType = WeatherEventType.NONE;
        }

        currentWeatherEvent = WeatherEvent({
            eventType: eventType,
            priceImpactPercent: impactPercent,
            timestamp: weatherData.timestamp,
            active: eventType != WeatherEventType.NONE
        });

        emit DisruptionUpdated(eventType, impactPercent, weatherData.timestamp);
    }

    /**
     * @notice Update weather event with simple rainfall data (for testing)
     * @param rainfall Rainfall in mm
     * @param latitude GPS latitude × 1e6
     * @param longitude GPS longitude × 1e6
     */
    function updateWeatherSimple(
        uint256 rainfall,
        int256 latitude,
        int256 longitude
    ) external onlyOwner {
        uint256 multiplier = calculateWeatherMultiplier(rainfall);
        int256 impactPercent = int256(multiplier) - 100;

        WeatherEventType eventType;
        if (rainfall < 10) {
            eventType = WeatherEventType.DROUGHT;
        } else {
            eventType = WeatherEventType.NONE;
        }

        currentWeatherEvent = WeatherEvent({
            eventType: eventType,
            priceImpactPercent: impactPercent,
            timestamp: block.timestamp,
            active: eventType != WeatherEventType.NONE
        });

        emit DisruptionUpdated(eventType, impactPercent, block.timestamp);
    }

    /**
     * @notice Clear current weather disruption
     */
    function clearDisruption() external onlyOwner {
        currentWeatherEvent.active = false;
        emit DisruptionCleared(block.timestamp);
    }

    /**
     * @notice Get current weather event details
     */
    function getCurrentWeatherEvent() external view returns (
        WeatherEventType eventType,
        int256 priceImpact,
        uint256 timestamp,
        bool active
    ) {
        return (
            currentWeatherEvent.eventType,
            currentWeatherEvent.priceImpactPercent,
            currentWeatherEvent.timestamp,
            currentWeatherEvent.active
        );
    }

    /**
     * @notice Emergency: Update base price manually
     * @param newBasePrice New base price in 18 decimals
     */
    function updateBasePrice(uint256 newBasePrice) external onlyOwner {
        require(newBasePrice > 0, "Base price must be positive");
        basePrice = newBasePrice;
        emit BasePriceUpdated(newBasePrice, block.timestamp);
    }

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Verify FDC Web2Json proof
     * @param proof The FDC proof to verify
     * @return bool True if proof is valid
     */
    function isWeb2JsonProofValid(IWeb2Json.Proof calldata proof) private view returns (bool) {
        return IFdcVerificationExtended(address(ContractRegistry.getFdcVerification())).verifyWeb2Json(proof);
    }

    // ABI signature helpers
    function abiSignaturePriceData(PriceData calldata data) external pure {}
    function abiSignatureWeatherData(WeatherData calldata data) external pure {}
}
