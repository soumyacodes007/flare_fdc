// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import { IWeb2Json } from "./interfaces/flare/IWeb2Json.sol";
import { IFdcVerificationExtended } from "./interfaces/flare/IFdcVerificationExtended.sol";

contract WeatherOracle {
    // Weather event types for agricultural commodities
    enum WeatherEventType {
        NONE,
        DROUGHT,           // Severe drought affecting crops
        FROST,             // Frost damage to crops
        FLOOD,             // Flooding affecting harvest
        HEATWAVE,          // Extreme heat affecting yield
        STORM              // Storms affecting production
    }

    struct WeatherEvent {
        WeatherEventType eventType;
        int256 priceImpactPercent;  // e.g., +50 = +50% (drought increases coffee price)
        uint256 timestamp;
        bool active;
    }

    // Data structures for FDC attestations
    struct PriceData {
        uint256 price;          // Coffee price in USDC (6 decimals)
        uint256 timestamp;
    }

    struct WeatherData {
        uint256 rainfall;        // Rainfall in mm (last 7 days)
        int256 temperature;      // Temperature in Celsius * 100 (e.g., 3500 = 35°C)
        int256 soilMoisture;     // Soil moisture percentage * 100
        int256 latitude;         // GPS latitude * 1e6
        int256 longitude;        // GPS longitude * 1e6
        uint256 timestamp;
    }

    uint256 public basePrice;
    WeatherEvent public currentWeatherEvent;
    address public owner;

    address public layerZeroEndpoint;
    address public destinationOracle;
    uint32 public destinationEid;

    // Weather multipliers for coffee prices
    uint256 public constant SEVERE_DROUGHT_MULTIPLIER = 150;  // 150% = 1.5x price
    uint256 public constant MODERATE_DROUGHT_MULTIPLIER = 130; // 130% = 1.3x price
    uint256 public constant MILD_DROUGHT_MULTIPLIER = 115;     // 115% = 1.15x price

    event DisruptionUpdated(
        WeatherEventType indexed eventType,
        int256 priceImpactPercent,
        uint256 timestamp
    );
    event DisruptionCleared(uint256 timestamp);
    event BasePriceUpdated(uint256 newPrice, uint256 timestamp);
    event PriceSentCrossChain(uint32 indexed dstEid, uint256 price, uint256 timestamp);
    event WeatherMultiplierCalculated(uint256 rainfall, uint256 multiplier);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    constructor(uint256 _basePrice) {
        owner = msg.sender;
        basePrice = _basePrice;
    }

    /**
     * @notice Get the theoretical price with weather adjustment (Innovation #2)
     * @return Theoretical price in USDC (6 decimals)
     * @dev Combines base market price with weather risk multiplier
     *      Formula: Adjusted Price = Base Price × Weather Multiplier
     */
    function getTheoreticalPrice() external view returns (uint256) {
        if (!currentWeatherEvent.active) {
            return basePrice;
        }

        // Apply weather multiplier based on event type
        // Formula: adjustedPrice = basePrice × (100 + impact) / 100
        int256 adjustedPrice = int256(basePrice) * (100 + currentWeatherEvent.priceImpactPercent) / 100;

        require(adjustedPrice > 0, "Invalid price calculation");

        return uint256(adjustedPrice);
    }

    /**
     * @notice Calculate weather multiplier from rainfall data
     * @param rainfall Rainfall in mm (last 7 days)
     * @return multiplier Price multiplier percentage (e.g., 150 = 1.5x)
     */
    function calculateWeatherMultiplier(uint256 rainfall) public pure returns (uint256) {
        if (rainfall == 0) {
            // SEVERE DROUGHT: 0mm rainfall
            return SEVERE_DROUGHT_MULTIPLIER; // 150% = 1.5x price
        } else if (rainfall < 5) {
            // MODERATE DROUGHT: 1-5mm rainfall
            return MODERATE_DROUGHT_MULTIPLIER; // 130% = 1.3x price
        } else if (rainfall < 10) {
            // MILD DROUGHT: 5-10mm rainfall
            return MILD_DROUGHT_MULTIPLIER; // 115% = 1.15x price
        } else {
            // NORMAL CONDITIONS: 10mm+ rainfall
            return 100; // 100% = 1.0x price (no change)
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
     * @notice Set weather disruption using FDC weather attestation (Innovation #2)
     * @param proof FDC Web2Json proof containing weather data from 3 APIs
     * @dev Queries OpenWeatherMap, WeatherAPI, and VisualCrossing
     *      Requires 2/3 consensus for drought confirmation
     */
    function setWeatherDisruptionWithFDC(IWeb2Json.Proof calldata proof) external {
        require(isWeb2JsonProofValid(proof), "Invalid FDC proof");

        WeatherData memory weatherData = abi.decode(
            proof.data.responseBody.abiEncodedData,
            (WeatherData)
        );

        require(weatherData.timestamp <= block.timestamp, "Future timestamp not allowed");
        require(weatherData.timestamp > block.timestamp - 1 hours, "Weather data too old");

        // Calculate weather multiplier from rainfall data
        uint256 multiplier = calculateWeatherMultiplier(weatherData.rainfall);

        // Calculate price impact percentage
        // Example: 150% multiplier = +50% impact
        int256 impactPercent = int256(multiplier) - 100;

        // Determine event type based on rainfall
        WeatherEventType eventType;
        if (weatherData.rainfall == 0) {
            eventType = WeatherEventType.DROUGHT;
        } else if (weatherData.rainfall < 5) {
            eventType = WeatherEventType.DROUGHT; // Moderate
        } else if (weatherData.rainfall < 10) {
            eventType = WeatherEventType.DROUGHT; // Mild
        } else {
            eventType = WeatherEventType.NONE;
        }

        // Update current weather event
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
     * @param rainfall Rainfall in mm (last 7 days)
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
     * @notice Clear current weather disruption (emergency only)
     */
    function clearDisruption() external onlyOwner {
        currentWeatherEvent.active = false;
        emit DisruptionCleared(block.timestamp);
    }

    /**
     * @notice Get current weather event details
     * @return eventType Type of weather event
     * @return priceImpact Price impact percentage
     * @return timestamp Event timestamp
     * @return active Whether event is active
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
     * @notice Emergency: Update base price manually (owner only)
     * @param newBasePrice New base price in USDC (6 decimals)
     */
    function updateBasePrice(uint256 newBasePrice) external onlyOwner {
        require(newBasePrice > 0, "Base price must be positive");
        basePrice = newBasePrice;
        emit BasePriceUpdated(newBasePrice, block.timestamp);
    }

    function setLayerZeroConfig(
        address _endpoint,
        uint32 _dstEid,
        address _dstOracle
    ) external onlyOwner {
        layerZeroEndpoint = _endpoint;
        destinationEid = _dstEid;
        destinationOracle = _dstOracle;
    }

    function sendPriceUpdate() external payable {
        require(layerZeroEndpoint != address(0), "LayerZero not configured");
        require(destinationEid != 0, "Destination not set");

        bytes memory payload = abi.encode(basePrice, block.timestamp);

        emit PriceSentCrossChain(destinationEid, basePrice, block.timestamp);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    function abiSignaturePriceData(PriceData calldata data) external pure {}
    function abiSignatureWeatherData(WeatherData calldata data) external pure {}

    /**
     * @notice Verify FDC Web2Json proof
     * @param proof The FDC proof to verify
     * @return bool True if proof is valid
     */
    function isWeb2JsonProofValid(IWeb2Json.Proof calldata proof) private view returns (bool) {
        return IFdcVerificationExtended(address(ContractRegistry.getFdcVerification())).verifyWeb2Json(proof);
    }
}
