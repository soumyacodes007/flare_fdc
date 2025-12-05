#!/usr/bin/env python3
"""
FDC Connection Test Script
Tests connection to Flare Data Connector and verifies integration
"""

import json
from web3 import Web3
from eth_account import Account
import requests
from datetime import datetime

# Flare Coston2 Configuration
COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc"
CHAIN_ID = 114

# FDC Verifier Contract on Coston2
FDC_VERIFICATION_CONTRACT = "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3"

# Contract Registry on Coston2
CONTRACT_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"

class FDCTester:
    def __init__(self, private_key=None):
        """Initialize FDC tester"""
        print("🔗 FDC Connection Tester")
        print("="*80)
        
        # Connect to Coston2
        self.w3 = Web3(Web3.HTTPProvider(COSTON2_RPC))
        
        if not self.w3.is_connected():
            raise Exception("❌ Failed to connect to Coston2")
        
        print(f"✅ Connected to Coston2")
        print(f"   RPC: {COSTON2_RPC}")
        print(f"   Chain ID: {self.w3.eth.chain_id}")
        print(f"   Block Number: {self.w3.eth.block_number}")
        
        # Load account if private key provided
        if private_key:
            self.account = Account.from_key(private_key)
            balance = self.w3.eth.get_balance(self.account.address)
            print(f"\n✅ Wallet loaded")
            print(f"   Address: {self.account.address}")
            print(f"   Balance: {self.w3.from_wei(balance, 'ether')} CFLR")
        else:
            self.account = None
            print(f"\n⚠️  No private key - read-only mode")
    
    def test_fdc_verification_contract(self):
        """Test FDC Verification contract"""
        print("\n" + "="*80)
        print("TEST 1: FDC Verification Contract")
        print("="*80)
        
        try:
            # Check if contract exists
            code = self.w3.eth.get_code(FDC_VERIFICATION_CONTRACT)
            
            if code == b'' or code == '0x':
                print(f"❌ No contract found at {FDC_VERIFICATION_CONTRACT}")
                return False
            
            print(f"✅ FDC Verification contract found")
            print(f"   Address: {FDC_VERIFICATION_CONTRACT}")
            print(f"   Code size: {len(code)} bytes")
            
            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_contract_registry(self):
        """Test Contract Registry"""
        print("\n" + "="*80)
        print("TEST 2: Contract Registry")
        print("="*80)
        
        try:
            # Check if contract exists
            code = self.w3.eth.get_code(CONTRACT_REGISTRY)
            
            if code == b'' or code == '0x':
                print(f"❌ No contract found at {CONTRACT_REGISTRY}")
                return False
            
            print(f"✅ Contract Registry found")
            print(f"   Address: {CONTRACT_REGISTRY}")
            print(f"   Code size: {len(code)} bytes")
            
            # Try to call getFdcVerification
            registry_abi = [
                {
                    "inputs": [],
                    "name": "getFdcVerification",
                    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(CONTRACT_REGISTRY),
                abi=registry_abi
            )
            
            fdc_address = contract.functions.getFdcVerification().call()
            print(f"✅ FDC Verification from registry: {fdc_address}")
            
            if fdc_address.lower() == FDC_VERIFICATION_CONTRACT.lower():
                print(f"✅ Address matches expected FDC contract")
            else:
                print(f"⚠️  Address differs from expected")
            
            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_weather_oracle_deployment(self, oracle_address=None):
        """Test if WeatherOracle is deployed"""
        print("\n" + "="*80)
        print("TEST 3: WeatherOracle Deployment")
        print("="*80)
        
        if not oracle_address:
            print("⚠️  No oracle address provided")
            print("   Deploy WeatherOracle first using:")
            print("   forge script script/DeployCoston2.s.sol --rpc-url coston2 --broadcast")
            return False
        
        try:
            code = self.w3.eth.get_code(oracle_address)
            
            if code == b'' or code == '0x':
                print(f"❌ No contract found at {oracle_address}")
                return False
            
            print(f"✅ WeatherOracle contract found")
            print(f"   Address: {oracle_address}")
            print(f"   Code size: {len(code)} bytes")
            
            # Try to read basePrice
            oracle_abi = [
                {
                    "inputs": [],
                    "name": "basePrice",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getTheoreticalPrice",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(oracle_address),
                abi=oracle_abi
            )
            
            base_price = contract.functions.basePrice().call()
            theoretical_price = contract.functions.getTheoreticalPrice().call()
            
            print(f"✅ Oracle state:")
            print(f"   Base Price: ${base_price / 1e6:.2f}")
            print(f"   Theoretical Price: ${theoretical_price / 1e6:.2f}")
            
            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_fdc_proof_structure(self):
        """Test FDC proof structure"""
        print("\n" + "="*80)
        print("TEST 4: FDC Proof Structure")
        print("="*80)
        
        # Example FDC proof structure
        proof_structure = {
            "data": {
                "attestationType": "0x5765623250726f6f66",  # Web2Json
                "sourceId": "0x5745425f41504900",  # WEB_API
                "votingRound": 0,
                "lowestUsedTimestamp": 0,
                "requestBody": {
                    "url": "https://api.weather.com/...",
                    "postProcessJSONPath": "$.data.rainfall"
                },
                "responseBody": {
                    "abiEncodedData": "0x..."
                }
            },
            "merkleProof": []
        }
        
        print("✅ FDC Proof Structure:")
        print(json.dumps(proof_structure, indent=2))
        
        print("\n📝 To create actual FDC proof:")
        print("   1. Submit attestation request to FDC verifier")
        print("   2. Wait for voting round completion")
        print("   3. Retrieve Merkle proof")
        print("   4. Call updateBasePriceWithFDC(proof)")
        
        return True
    
    def test_weather_api_connectivity(self):
        """Test weather API connectivity"""
        print("\n" + "="*80)
        print("TEST 5: Weather API Connectivity")
        print("="*80)
        
        apis = {
            'VisualCrossing': 'https://weather.visualcrossing.com',
            'WeatherAPI': 'http://api.weatherapi.com',
            'OpenWeatherMap': 'https://api.openweathermap.org'
        }
        
        results = {}
        for name, url in apis.items():
            try:
                response = requests.get(url, timeout=5)
                results[name] = True
                print(f"✅ {name}: Reachable")
            except Exception as e:
                results[name] = False
                print(f"❌ {name}: {e}")
        
        if all(results.values()):
            print(f"\n✅ All weather APIs reachable")
            return True
        else:
            print(f"\n⚠️  Some APIs unreachable")
            return False
    
    def generate_deployment_checklist(self):
        """Generate deployment checklist"""
        print("\n" + "="*80)
        print("📋 DEPLOYMENT CHECKLIST")
        print("="*80)
        
        checklist = [
            ("Get Coston2 CFLR from faucet", "https://faucet.flare.network/"),
            ("Set PRIVATE_KEY in .env", "Your wallet private key"),
            ("Deploy WeatherOracle", "forge script script/DeployCoston2.s.sol --rpc-url coston2 --broadcast"),
            ("Deploy CoffeeToken", "Included in deployment script"),
            ("Deploy MockUSDC", "Included in deployment script"),
            ("Deploy InsuranceVault", "Included in deployment script"),
            ("Deploy AgriHook", "Requires Uniswap V4 on Coston2"),
            ("Test oracle update", "Call updateWeatherSimple()"),
            ("Test insurance policy", "Call createPolicy()"),
            ("Test claim payout", "Call claimPayout()"),
        ]
        
        for i, (task, detail) in enumerate(checklist, 1):
            print(f"\n{i}. {task}")
            print(f"   {detail}")
        
        print("\n" + "="*80)
    
    def run_all_tests(self, oracle_address=None):
        """Run all FDC tests"""
        print("\n" + "="*80)
        print("🧪 RUNNING ALL FDC TESTS")
        print("="*80)
        
        results = {
            'fdc_verification': self.test_fdc_verification_contract(),
            'contract_registry': self.test_contract_registry(),
            'weather_oracle': self.test_weather_oracle_deployment(oracle_address),
            'fdc_proof': self.test_fdc_proof_structure(),
            'weather_apis': self.test_weather_api_connectivity()
        }
        
        # Summary
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        
        passed = sum(results.values())
        total = len(results)
        
        for test, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} - {test}")
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n🎉 All tests passed! FDC integration ready.")
        else:
            print("\n⚠️  Some tests failed. Check configuration.")
        
        # Generate checklist
        self.generate_deployment_checklist()
        
        # Save results
        output = {
            'timestamp': datetime.now().isoformat(),
            'chain_id': self.w3.eth.chain_id,
            'block_number': self.w3.eth.block_number,
            'tests': results,
            'passed': passed,
            'total': total
        }
        
        with open('fdc_test_results.json', 'w') as f:
            json.dump(output, f, indent=2)
        
        print("\n💾 Results saved to fdc_test_results.json")

def main():
    """Main entry point"""
    import os
    
    # Try to load private key from environment
    private_key = os.getenv('PRIVATE_KEY')
    
    # Try to load oracle address from environment
    oracle_address = os.getenv('WEATHER_ORACLE_ADDRESS')
    
    # Initialize tester
    tester = FDCTester(private_key)
    
    # Run all tests
    tester.run_all_tests(oracle_address)

if __name__ == '__main__':
    main()
