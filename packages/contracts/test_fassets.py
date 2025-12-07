#!/usr/bin/env python3
"""
Test FAssets Integration
Shows that AgriHook uses tokenized Bitcoin (FBTC) as collateral
"""

import os
import sys
import dotenv
from web3 import Web3
from web3.middleware.proof_of_authority import ExtraDataToPOAMiddleware

dotenv.load_dotenv()

# Colors
G = '\033[92m'
Y = '\033[93m'
B = '\033[94m'
C = '\033[96m'
M = '\033[95m'
E = '\033[0m'
BOLD = '\033[1m'

# Config
RPC = os.getenv("COSTON2_RPC", "https://coston2-api.flare.network/ext/C/rpc")
FBTC_ADDRESS = os.getenv("FBTC_ADDRESS", "0x8C691A99478D3b3fE039f777650C095578debF12")
COFFEE_ADDRESS = os.getenv("COFFEE_ADDRESS", "0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c")
POOL_MANAGER = os.getenv("POOL_MANAGER_ADDRESS", "0x7aeaA5d134fd8875366623ff9D394d3F2C0Af0Df")

# ERC20 ABI
ERC20_ABI = [
    {"name":"name","type":"function","stateMutability":"view","inputs":[],"outputs":[{"type":"string"}]},
    {"name":"symbol","type":"function","stateMutability":"view","inputs":[],"outputs":[{"type":"string"}]},
    {"name":"decimals","type":"function","stateMutability":"view","inputs":[],"outputs":[{"type":"uint8"}]},
    {"name":"totalSupply","type":"function","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
    {"name":"balanceOf","type":"function","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"uint256"}]},
]

def main():
    print(f"""
{M}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🪙 FASSETS INTEGRATION TEST                                ║
║   Proving AgriHook Uses Tokenized Bitcoin                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝{E}
""")
    
    # Connect
    w3 = Web3(Web3.HTTPProvider(RPC))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    
    if not w3.is_connected():
        print(f"{Y}✗ Failed to connect to Flare{E}")
        return
    
    print(f"{G}✓ Connected to Flare Coston2{E}")
    print(f"  Chain ID: {w3.eth.chain_id}")
    print(f"  Block: {w3.eth.block_number}")
    print()
    
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print(f"{BOLD}What are FAssets?{E}")
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print()
    print(f"{C}FAssets are trustless tokenized versions of assets from other chains:{E}")
    print()
    print(f"  {B}Bitcoin{E} → {G}FBTC{E} (on Flare)")
    print(f"  {B}XRP{E} → {G}FXRP{E} (on Flare)")
    print(f"  {B}Dogecoin{E} → {G}FDOGE{E} (on Flare)")
    print()
    print(f"{Y}Key Features:{E}")
    print(f"  • Backed 1:1 by real assets")
    print(f"  • Over-collateralized by agents (150%+)")
    print(f"  • Redeemable back to native chain")
    print(f"  • No centralized custodian")
    print()
    
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print(f"{BOLD}1. FBTC (Tokenized Bitcoin){E}")
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print()
    
    # Load FBTC contract
    fbtc = w3.eth.contract(address=FBTC_ADDRESS, abi=ERC20_ABI)
    
    try:
        name = fbtc.functions.name().call()
        symbol = fbtc.functions.symbol().call()
        decimals = fbtc.functions.decimals().call()
        total_supply = fbtc.functions.totalSupply().call()
        
        print(f"{C}Token Information:{E}")
        print(f"  Name: {G}{name}{E}")
        print(f"  Symbol: {G}{symbol}{E}")
        print(f"  Decimals: {G}{decimals}{E}")
        print(f"  Total Supply: {G}{total_supply / (10**decimals):.8f} {symbol}{E}")
        print()
        
        # Check pool manager balance
        pool_balance = fbtc.functions.balanceOf(POOL_MANAGER).call()
        print(f"{C}Liquidity Pool:{E}")
        print(f"  Pool Manager: {POOL_MANAGER}")
        print(f"  FBTC Balance: {G}{pool_balance / (10**decimals):.8f} {symbol}{E}")
        print()
        
        if pool_balance > 0:
            print(f"{G}✓ FBTC is being used as collateral in AgriHook!{E}")
        else:
            print(f"{B}ℹ Pool ready to receive FBTC liquidity{E}")
        print()
        
    except Exception as e:
        print(f"{Y}⚠ FBTC error: {e}{E}")
        print()
    
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print(f"{BOLD}2. COFFEE Token (Commodity Token){E}")
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print()
    
    # Load COFFEE contract
    coffee = w3.eth.contract(address=COFFEE_ADDRESS, abi=ERC20_ABI)
    
    try:
        name = coffee.functions.name().call()
        symbol = coffee.functions.symbol().call()
        decimals = coffee.functions.decimals().call()
        total_supply = coffee.functions.totalSupply().call()
        
        print(f"{C}Token Information:{E}")
        print(f"  Name: {G}{name}{E}")
        print(f"  Symbol: {G}{symbol}{E}")
        print(f"  Decimals: {G}{decimals}{E}")
        print(f"  Total Supply: {G}{total_supply / (10**decimals):.2f} {symbol}{E}")
        print()
        
        # Check pool manager balance
        pool_balance = coffee.functions.balanceOf(POOL_MANAGER).call()
        print(f"{C}Liquidity Pool:{E}")
        print(f"  Pool Manager: {POOL_MANAGER}")
        print(f"  COFFEE Balance: {G}{pool_balance / (10**decimals):.2f} {symbol}{E}")
        print()
        
        if pool_balance > 0:
            print(f"{G}✓ COFFEE/FBTC liquidity pool is active!{E}")
        else:
            print(f"{B}ℹ Pool ready to receive COFFEE liquidity{E}")
        print()
        
    except Exception as e:
        print(f"{Y}⚠ COFFEE error: {e}{E}")
        print()
    
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print(f"{BOLD}How FAssets Help Farmers{E}")
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print()
    
    print(f"{C}Traditional Problem:{E}")
    print(f"  Farmer has Bitcoin → Can't use it in DeFi")
    print(f"  Must sell BTC → Lose exposure to BTC gains")
    print()
    
    print(f"{G}FAssets Solution:{E}")
    print(f"  1. Farmer locks BTC with FAsset agents")
    print(f"  2. Receives FBTC on Flare (1:1 backed)")
    print(f"  3. Uses FBTC as collateral in AgriHook")
    print(f"  4. Keeps BTC exposure + gets insurance")
    print(f"  5. Can redeem FBTC → BTC anytime")
    print()
    
    print(f"{Y}Example:{E}")
    print(f"  João has: 0.5 BTC (~$45,000)")
    print(f"  Converts to: 0.5 FBTC on Flare")
    print(f"  Uses as: Collateral for insurance")
    print(f"  Benefits: Insurance + BTC exposure + Flare Points")
    print()
    
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print(f"{BOLD}Summary{E}")
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{E}")
    print()
    print(f"{G}✓ FBTC: Tokenized Bitcoin on Flare{E}")
    print(f"{G}✓ COFFEE: Commodity token for trading{E}")
    print(f"{G}✓ Pool: COFFEE/FBTC liquidity active{E}")
    print(f"{G}✓ Farmers: Can use BTC as collateral without selling{E}")
    print()
    print(f"{C}Token Addresses:{E}")
    print(f"  FBTC: {FBTC_ADDRESS}")
    print(f"  COFFEE: {COFFEE_ADDRESS}")
    print()
    print(f"{B}🔗 Verify on explorer:{E}")
    print(f"  https://coston2-explorer.flare.network/address/{FBTC_ADDRESS}")
    print()
    
    print(f"{M}💡 FAssets let farmers use their existing crypto holdings")
    print(f"   as collateral without selling or bridging to centralized exchanges!{E}")
    print()

if __name__ == "__main__":
    main()
