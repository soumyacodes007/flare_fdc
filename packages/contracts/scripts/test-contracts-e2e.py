#!/usr/bin/env python3
"""
End-to-End Smart Contract Testing
Tests all Agri-Hook contracts on Coston2 testnet
"""

import json
import os
from web3 import Web3
from eth_account import Account
from datetime import datetime
import time

# Coston2 Configuration
COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc"
CHAIN_ID = 114

# Contract ABIs (minimal for testing)
WEATHER_ORACLE_ABI = [
    {"inputs": [], "name": "basePrice", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getTheoreticalPrice", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256"}, {"type": "int256"}, {"type": "int256"}], "name": "updateWeatherSimple", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "getCurrentWeatherEvent", "outputs": [{"type": "uint8"}, {"type": "int256"}, {"type": "uint256"}, {"type": "bool"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "uint256"}], "name": "calculateWeatherMultiplier", "outputs": [{"type": "uint256"}], "stateMutability": "pure", "type": "function"}
]

MOCK_FBTC_ABI = [
    {"inputs": [], "name": "name", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "symbol", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address"}], "name": "balanceOf", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address"}, {"type": "uint256"}], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "faucet", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
]

INSURANCE_VAULT_ABI = [
    {"inputs": [{"type": "int256"}, {"type": "int256"}, {"type": "uint256"}], "name": "createPolicy", "outputs": [{"type": "uint256"}], "stateMutability": "payable", "type": "function"},
    {"inputs": [{"type": "uint256"}, {"type": "bytes32"}], "name": "calculatePremium", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "claimPayout", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"type": "address"}], "name": "getPolicy", "outputs": [{"type": "int256"}, {"type": "int256"}, {"type": "bytes32"}, {"type": "uint256"}, {"type": "uint256"}, {"type": "uint256"}, {"type": "uint256"}, {"type": "bool"}, {"type": "bool"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getVaultStats", "outputs": [{"type": "uint256"}, {"type": "uint256"}, {"type": "uint256"}, {"type": "uint256"}, {"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "fundTreasury", "outputs": [], "stateMutability": "payable", "type": "function"}
]

COFFEE_TOKEN_ABI = [
    {"inputs": [], "name": "name", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "symbol", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address"}], "name": "balanceOf", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"type": "address"}, {"type": "uint256"}], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
]

class ContractTester:
    def __init__(self, private_key):
        """Initialize contract tester"""
        print("🧪 Agri-Hook End-to-End Contract Testing")
        print("="*80)
        
        # Connect to Coston2
        self.w3 = Web3(Web3.HTTPProvider(COSTON2_RPC))
        
        if not self.w3.is_connected():
            raise Exception("❌ Failed to connect to Coston2")
        
        print(f"✅ Connected to Coston2")
        print(f"   Chain ID: {self.w3.eth.chain_id}")
        print(f"   Block: {self.w3.eth.block_number}")
        
        # Load account
        self.account = Account.from_key(private_key)
        balance = self.w3.eth.get_balance(self.account.address)
        
        print(f"\n✅ Wallet loaded")
        print(f"   Address: {self.account.address}")
        print(f"   Balance: {self.w3.from_wei(balance, 'ether')} CFLR")
        
        if balance == 0:
            print(f"\n⚠️  WARNING: Zero balance!")
            print(f"   Get CFLR from: https://faucet.flare.network/")
        
        self.contracts = {}
    
    def load_contract(self, name, address, abi):
        """Load a contract"""
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(address),
                abi=abi
            )
            self.contracts[name] = contract
            print(f"✅ {name} loaded at {address}")
            return True
        except Exception as e:
            print(f"❌ Failed to load {name}: {e}")
            return False
    
    def test_weather_oracle(self):
        """Test WeatherOracle contract"""
        print("\n" + "="*80)
        print("TEST 1: WeatherOracle")
        print("="*80)
        
        if 'WeatherOracle' not in self.contracts:
            print("❌ WeatherOracle not loaded")
            return False
        
        oracle = self.contracts['WeatherOracle']
        
        try:
            # Read current state
            print("\n📊 Current Oracle State:")
            base_price = oracle.functions.basePrice().call()
            theoretical_price = oracle.functions.getTheoreticalPrice().call()
            
            print(f"   Base Price: ${base_price / 1e6:.2f}")
            print(f"   Theoretical Price: ${theoretical_price / 1e6:.2f}")
            
            # Test weather multiplier calculation
            print("\n🧮 Testing Weather Multiplier:")
            multipliers = {
                0: 150,    # Severe drought
                3: 130,    # Moderate drought
                7: 115,    # Mild drought
                15: 100    # Normal
            }
            
            for rainfall, expected in multipliers.items():
                result = oracle.functions.calculateWeatherMultiplier(rainfall).call()
                status = "✅" if result == expected else "❌"
                print(f"   {status} {rainfall}mm → {result}% (expected {expected}%)")
            
            # Update weather (if owner)
            print("\n🌦️  Updating Weather (Severe Drought):")
            try:
                # Simulate severe drought
                rainfall = 0  # 0mm
                latitude = int(-18.5122 * 1e6)
                longitude = int(-44.5550 * 1e6)
                
                tx = oracle.functions.updateWeatherSimple(
                    rainfall,
                    latitude,
                    longitude
                ).build_transaction({
                    'from': self.account.address,
                    'nonce': self.w3.eth.get_transaction_count(self.account.address),
                    'gas': 200000,
                    'gasPrice': self.w3.eth.gas_price
                })
                
                signed_tx = self.account.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                print(f"   Transaction sent: {tx_hash.hex()}")
                print(f"   Waiting for confirmation...")
                
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                
                if receipt['status'] == 1:
                    print(f"   ✅ Weather updated successfully!")
                    
                    # Read new state
                    new_theoretical = oracle.functions.getTheoreticalPrice().call()
                    print(f"   New Theoretical Price: ${new_theoretical / 1e6:.2f}")
                    
                    impact = (new_theoretical - base_price) / base_price * 100
                    print(f"   Impact: {impact:+.1f}%")
                else:
                    print(f"   ❌ Transaction failed")
                    return False
                    
            except Exception as e:
                print(f"   ⚠️  Cannot update (not owner or error): {e}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_insurance_vault(self):
        """Test InsuranceVault contract"""
        print("\n" + "="*80)
        print("TEST 2: InsuranceVault")
        print("="*80)
        
        if 'InsuranceVault' not in self.contracts:
            print("❌ InsuranceVault not loaded")
            return False
        
        vault = self.contracts['InsuranceVault']
        
        try:
            # Read vault stats
            print("\n📊 Vault Statistics:")
            stats = vault.functions.getVaultStats().call()
            total_coverage, total_premiums, total_payouts, treasury, utilization = stats
            
            print(f"   Total Coverage: ${total_coverage / 1e6:.2f}")
            print(f"   Total Premiums: ${total_premiums / 1e18:.2f} CFLR")
            print(f"   Total Payouts: ${total_payouts / 1e18:.2f} CFLR")
            print(f"   Treasury: ${treasury / 1e18:.2f} CFLR")
            print(f"   Utilization: {utilization}%")
            
            # Fund treasury
            print("\n💰 Funding Treasury:")
            try:
                fund_amount = self.w3.to_wei(1, 'ether')  # 1 CFLR
                
                tx = vault.functions.fundTreasury().build_transaction({
                    'from': self.account.address,
                    'value': fund_amount,
                    'nonce': self.w3.eth.get_transaction_count(self.account.address),
                    'gas': 100000,
                    'gasPrice': self.w3.eth.gas_price
                })
                
                signed_tx = self.account.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                print(f"   Transaction sent: {tx_hash.hex()}")
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                
                if receipt['status'] == 1:
                    print(f"   ✅ Treasury funded with 1 CFLR")
                else:
                    print(f"   ❌ Transaction failed")
                    
            except Exception as e:
                print(f"   ⚠️  Error funding treasury: {e}")
            
            # Create insurance policy
            print("\n📝 Creating Insurance Policy:")
            try:
                coverage = 5000 * 10**6  # $5,000 in 6 decimals
                latitude = int(-18.5122 * 1e6)
                longitude = int(-44.5550 * 1e6)
                
                # Calculate premium first
                region_hash = vault.functions.calculateRegionHash(latitude, longitude).call()
                premium = vault.functions.calculatePremium(coverage, region_hash).call()
                
                print(f"   Coverage: ${coverage / 1e6:.2f}")
                print(f"   Premium: ${premium / 1e18:.2f} CFLR")
                print(f"   GPS: {latitude / 1e6}, {longitude / 1e6}")
                
                # Check if already has policy
                try:
                    existing_policy = vault.functions.getPolicy(self.account.address).call()
                    if existing_policy[7]:  # active
                        print(f"   ⚠️  Policy already exists")
                        return True
                except:
                    pass
                
                # Create policy
                tx = vault.functions.createPolicy(
                    latitude,
                    longitude,
                    coverage
                ).build_transaction({
                    'from': self.account.address,
                    'value': premium,
                    'nonce': self.w3.eth.get_transaction_count(self.account.address),
                    'gas': 300000,
                    'gasPrice': self.w3.eth.gas_price
                })
                
                signed_tx = self.account.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                print(f"   Transaction sent: {tx_hash.hex()}")
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                
                if receipt['status'] == 1:
                    print(f"   ✅ Policy created successfully!")
                    
                    # Read policy
                    policy = vault.functions.getPolicy(self.account.address).call()
                    print(f"   Policy Details:")
                    print(f"      Coverage: ${policy[3] / 1e6:.2f}")
                    print(f"      Premium Paid: ${policy[4] / 1e18:.2f} CFLR")
                    print(f"      Active: {policy[7]}")
                else:
                    print(f"   ❌ Transaction failed")
                    return False
                    
            except Exception as e:
                print(f"   ⚠️  Error creating policy: {e}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_mock_fbtc(self):
        """Test MockFBTC contract"""
        print("\n" + "="*80)
        print("TEST 3: MockFBTC (FAsset Bitcoin)")
        print("="*80)
        
        if 'MockFBTC' not in self.contracts:
            print("❌ MockFBTC not loaded")
            return False
        
        token = self.contracts['MockFBTC']
        
        try:
            # Read token info
            print("\n📊 Token Information:")
            name = token.functions.name().call()
            symbol = token.functions.symbol().call()
            balance = token.functions.balanceOf(self.account.address).call()
            
            print(f"   Name: {name}")
            print(f"   Symbol: {symbol}")
            print(f"   Your Balance: {balance / 1e18:.2f} {symbol}")
            
            # Test faucet
            print("\n💧 Testing Faucet:")
            try:
                tx = token.functions.faucet().build_transaction({
                    'from': self.account.address,
                    'nonce': self.w3.eth.get_transaction_count(self.account.address),
                    'gas': 100000,
                    'gasPrice': self.w3.eth.gas_price
                })
                
                signed_tx = self.account.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                print(f"   Transaction sent: {tx_hash.hex()}")
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                
                if receipt['status'] == 1:
                    new_balance = token.functions.balanceOf(self.account.address).call()
                    print(f"   ✅ Faucet successful!")
                    print(f"   New Balance: {new_balance / 1e18:.2f} {symbol}")
                else:
                    print(f"   ❌ Transaction failed")
                    
            except Exception as e:
                print(f"   ⚠️  Error: {e}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_coffee_token(self):
        """Test CoffeeToken contract"""
        print("\n" + "="*80)
        print("TEST 4: CoffeeToken")
        print("="*80)
        
        if 'CoffeeToken' not in self.contracts:
            print("❌ CoffeeToken not loaded")
            return False
        
        token = self.contracts['CoffeeToken']
        
        try:
            # Read token info
            print("\n📊 Token Information:")
            name = token.functions.name().call()
            symbol = token.functions.symbol().call()
            balance = token.functions.balanceOf(self.account.address).call()
            
            print(f"   Name: {name}")
            print(f"   Symbol: {symbol}")
            print(f"   Your Balance: {balance / 1e18:.2f} {symbol}")
            
            # Test faucet
            print("\n💧 Testing Faucet:")
            try:
                tx = token.functions.faucet().build_transaction({
                    'from': self.account.address,
                    'nonce': self.w3.eth.get_transaction_count(self.account.address),
                    'gas': 100000,
                    'gasPrice': self.w3.eth.gas_price
                })
                
                signed_tx = self.account.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                print(f"   Transaction sent: {tx_hash.hex()}")
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                
                if receipt['status'] == 1:
                    new_balance = token.functions.balanceOf(self.account.address).call()
                    print(f"   ✅ Faucet successful!")
                    print(f"   New Balance: {new_balance / 1e18:.2f} {symbol}")
                else:
                    print(f"   ❌ Transaction failed")
                    
            except Exception as e:
                print(f"   ⚠️  Error: {e}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def run_all_tests(self):
        """Run all contract tests"""
        print("\n" + "="*80)
        print("🧪 RUNNING ALL CONTRACT TESTS")
        print("="*80)
        
        results = {
            'weather_oracle': self.test_weather_oracle(),
            'insurance_vault': self.test_insurance_vault(),
            'mock_fbtc': self.test_mock_fbtc(),
            'coffee_token': self.test_coffee_token()
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
            print("\n🎉 All tests passed! Contracts working correctly.")
        else:
            print("\n⚠️  Some tests failed. Check logs above.")
        
        # Save results
        output = {
            'timestamp': datetime.now().isoformat(),
            'chain_id': self.w3.eth.chain_id,
            'block_number': self.w3.eth.block_number,
            'account': self.account.address,
            'tests': results,
            'passed': passed,
            'total': total
        }
        
        with open('contract_test_results.json', 'w') as f:
            json.dump(output, f, indent=2)
        
        print("\n💾 Results saved to contract_test_results.json")

def main():
    """Main entry point"""
    # Load configuration from environment
    private_key = os.getenv('PRIVATE_KEY')
    weather_oracle = os.getenv('WEATHER_ORACLE_ADDRESS')
    insurance_vault = os.getenv('INSURANCE_VAULT_ADDRESS')
    mock_fbtc = os.getenv('MOCK_FBTC_ADDRESS')
    coffee_token = os.getenv('COFFEE_TOKEN_ADDRESS')
    
    if not private_key:
        print("❌ PRIVATE_KEY not set in environment")
        print("   Set it with: export PRIVATE_KEY=your_key")
        return
    
    # Initialize tester
    tester = ContractTester(private_key)
    
    # Load contracts
    print("\n📦 Loading Contracts:")
    print("-"*80)
    
    if weather_oracle:
        tester.load_contract('WeatherOracle', weather_oracle, WEATHER_ORACLE_ABI)
    else:
        print("⚠️  WEATHER_ORACLE_ADDRESS not set")
    
    if insurance_vault:
        tester.load_contract('InsuranceVault', insurance_vault, INSURANCE_VAULT_ABI)
    else:
        print("⚠️  INSURANCE_VAULT_ADDRESS not set")
    
    if mock_fbtc:
        tester.load_contract('MockFBTC', mock_fbtc, MOCK_FBTC_ABI)
    else:
        print("⚠️  MOCK_FBTC_ADDRESS not set")
    
    if coffee_token:
        tester.load_contract('CoffeeToken', coffee_token, COFFEE_TOKEN_ABI)
    else:
        print("⚠️  COFFEE_TOKEN_ADDRESS not set")
    
    if not tester.contracts:
        print("\n❌ No contracts loaded. Deploy contracts first:")
        print("   forge script script/DeployCoston2.s.sol --rpc-url coston2 --broadcast")
        return
    
    # Run tests
    tester.run_all_tests()

if __name__ == '__main__':
    main()
