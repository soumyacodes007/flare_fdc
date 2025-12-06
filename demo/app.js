// Contract Addresses (Coston2)
const CONTRACTS = {
    WEATHER_ORACLE: '0x223163b9109e43BdA9d719DF1e7E584d781b93fd',
    INSURANCE_VAULT: '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438',
    AGRI_HOOK: '0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0',
    FBTC: '0x8C691A99478D3b3fE039f777650C095578debF12',
    COFFEE: '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c'
};

const RPC_URL = 'https://coston2-api.flare.network/ext/C/rpc';
const CHAIN_ID = 114;

// ABIs
const ORACLE_ABI = [
    'function basePrice() view returns (uint256)',
    'function getTheoreticalPrice() view returns (uint256)',
    'function getCurrentWeatherEvent() view returns (uint8, int256, uint256, bool)',
    'function updateWeatherSimple(uint256 rainfall, int256 latitude, int256 longitude)',
    'function updatePriceFromFTSO()',
    'function getCurrentFTSOPrice() view returns (uint256, uint256, uint256)'
];

const VAULT_ABI = [
    'function createPolicy(int256 latitude, int256 longitude, uint256 coverageAmount) payable returns (uint256)',
    'function claimPayout()',
    'function policies(address) view returns (address, int256, int256, bytes32, uint256, uint256, uint256, uint256, bool, bool)',
    'function treasuryBalance() view returns (uint256)',
    'function fundTreasury() payable'
];

const FBTC_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
];

// State
let provider, signer, userAddress;
let oracleContract, vaultContract, fbtcContract;
let isDroughtActive = false;
let treasuryAmount = 0;
let ftsoPrice = 0;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    let connected = false;
    
    // Try primary RPC
    try {
        provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        await provider.getBlockNumber();
        connected = true;
        terminalLog('Connected to Flare Coston2', 'success');
    } catch (e) {
        console.log('Primary RPC failed:', e.message);
    }
    
    // Try fallback RPC
    if (!connected) {
        try {
            provider = new ethers.providers.JsonRpcProvider('https://coston2.enosys.global/ext/C/rpc');
            await provider.getBlockNumber();
            connected = true;
            terminalLog('Connected via fallback RPC', 'success');
        } catch (e2) {
            console.log('Fallback RPC failed:', e2.message);
        }
    }
    
    if (!connected) {
        terminalLog('RPC unavailable - Connect MetaMask to continue', 'warning');
        // Set default display values
        document.getElementById('basePrice').textContent = '8.99';
        document.getElementById('theoreticalPrice').textContent = '13.49';
        document.getElementById('ftsoPrice').textContent = '89,950';
        document.getElementById('treasuryValue').textContent = '10.00';
    }
    
    if (provider) {
        oracleContract = new ethers.Contract(CONTRACTS.WEATHER_ORACLE, ORACLE_ABI, provider);
        vaultContract = new ethers.Contract(CONTRACTS.INSURANCE_VAULT, VAULT_ABI, provider);
        fbtcContract = new ethers.Contract(CONTRACTS.FBTC, FBTC_ABI, provider);
    }
    
    setupEventListeners();
    
    if (connected) {
        await refreshData();
        setInterval(refreshData, 15000);
    }
    
    terminalLog('AgriHook initialized');
    terminalLog('[FTSO] Price feed: testBTC', 'highlight');
    terminalLog('[FDC] Weather oracle ready', 'highlight');
    terminalLog('[FAsset] FBTC contract loaded', 'highlight');
    
    // Check MetaMask
    if (window.ethereum) {
        terminalLog('[WALLET] MetaMask detected ✓', 'success');
    } else {
        terminalLog('[WALLET] MetaMask not detected - install or enable it', 'warning');
    }
}

function setupEventListeners() {
    document.getElementById('connectBtn').addEventListener('click', connectWallet);
    document.getElementById('droughtToggle').addEventListener('change', toggleDrought);
    document.getElementById('botAttackBtn').addEventListener('click', simulateBotAttack);
    document.getElementById('createPolicyBtn').addEventListener('click', createPolicy);
    document.getElementById('claimBtn').addEventListener('click', claimPayout);
    document.getElementById('updateFtsoBtn').addEventListener('click', updateFTSO);
}

// Connect Wallet
async function connectWallet() {
    // Check for MetaMask or other wallet
    const ethereum = window.ethereum || window.web3?.currentProvider;
    
    if (!ethereum) {
        showToast('error', 'MetaMask Required', 'Please install MetaMask or refresh the page');
        terminalLog('window.ethereum not found. Make sure MetaMask is installed and enabled.', 'error');
        console.log('window.ethereum:', window.ethereum);
        console.log('window.web3:', window.web3);
        return;
    }
    
    // Use the detected provider
    window.ethereum = ethereum;

    try {
        showLoading('Connecting...');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        
        // Switch to Coston2
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x72' }]
            });
        } catch (e) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x72',
                    chainName: 'Flare Coston2',
                    nativeCurrency: { name: 'C2FLR', symbol: 'C2FLR', decimals: 18 },
                    rpcUrls: [RPC_URL],
                    blockExplorerUrls: ['https://coston2-explorer.flare.network']
                }]
            });
        }
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        oracleContract = new ethers.Contract(CONTRACTS.WEATHER_ORACLE, ORACLE_ABI, signer);
        vaultContract = new ethers.Contract(CONTRACTS.INSURANCE_VAULT, VAULT_ABI, signer);
        fbtcContract = new ethers.Contract(CONTRACTS.FBTC, FBTC_ABI, provider);
        
        document.getElementById('connectBtn').classList.add('connected');
        document.getElementById('connectText').textContent = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        
        terminalLog(`Wallet connected: ${userAddress}`, 'success');
        await refreshData();
        hideLoading();
    } catch (error) {
        hideLoading();
        terminalLog(`Connection failed: ${error.message}`, 'error');
    }
}

// Refresh Data
async function refreshData() {
    if (!provider) {
        console.log('No provider available');
        return;
    }
    
    try {
        const [basePrice, theoreticalPrice, weatherEvent] = await Promise.all([
            oracleContract.basePrice(),
            oracleContract.getTheoreticalPrice(),
            oracleContract.getCurrentWeatherEvent()
        ]);
        
        const base = parseFloat(ethers.utils.formatEther(basePrice));
        const theoretical = parseFloat(ethers.utils.formatEther(theoreticalPrice));
        const gap = theoretical > 0 ? ((theoretical - base) / base * 100).toFixed(0) : 0;
        
        document.getElementById('basePrice').textContent = base.toFixed(4);
        document.getElementById('theoreticalPrice').textContent = theoretical.toFixed(4);
        document.getElementById('priceGap').textContent = gap + '%';
        
        if (parseInt(gap) > 20) {
            document.getElementById('priceGap').classList.add('high');
        } else {
            document.getElementById('priceGap').classList.remove('high');
        }
        
        // Weather status
        const [eventType, priceImpact, , active] = weatherEvent;
        isDroughtActive = active && eventType === 1;
        updateDroughtUI(isDroughtActive, priceImpact.toNumber());
        
        // Treasury
        try {
            const treasury = await vaultContract.treasuryBalance();
            treasuryAmount = parseFloat(ethers.utils.formatEther(treasury));
            document.getElementById('treasuryValue').textContent = treasuryAmount.toFixed(2);
        } catch (e) {
            const balance = await provider.getBalance(CONTRACTS.INSURANCE_VAULT);
            treasuryAmount = parseFloat(ethers.utils.formatEther(balance));
            document.getElementById('treasuryValue').textContent = treasuryAmount.toFixed(2);
        }
        
        // FTSO Price
        try {
            const [price, , decimals] = await oracleContract.getCurrentFTSOPrice();
            ftsoPrice = parseFloat(ethers.utils.formatUnits(price, decimals));
            document.getElementById('ftsoPrice').textContent = ftsoPrice.toLocaleString(undefined, { maximumFractionDigits: 2 });
        } catch (e) {
            document.getElementById('ftsoPrice').textContent = '89,950';
            ftsoPrice = 89950;
        }
        
        // User balance & policy
        if (userAddress) {
            const balance = await provider.getBalance(userAddress);
            document.getElementById('walletBalance').textContent = parseFloat(ethers.utils.formatEther(balance)).toFixed(2);
            
            // FBTC Balance
            try {
                const fbtcBalance = await fbtcContract.balanceOf(userAddress);
                const fbtcFormatted = parseFloat(ethers.utils.formatEther(fbtcBalance));
                document.getElementById('fbtcBalance').textContent = fbtcFormatted.toFixed(4);
                document.getElementById('fbtcUsdValue').textContent = (fbtcFormatted * ftsoPrice).toLocaleString(undefined, { maximumFractionDigits: 2 });
            } catch (e) {
                document.getElementById('fbtcBalance').textContent = '0.0000';
                document.getElementById('fbtcUsdValue').textContent = '0';
            }
            
            await checkPolicy();
        }
    } catch (error) {
        console.error('Refresh error:', error);
    }
}

function updateDroughtUI(active, impact) {
    const statusBadge = document.getElementById('weatherStatusBadge');
    const oracleCard = document.getElementById('oracleCard');
    const feeValue = document.getElementById('currentFee');
    const feeFill = document.getElementById('feeFill');
    const claimCard = document.getElementById('claimCard');
    const claimBtn = document.getElementById('claimBtn');
    const botBtn = document.getElementById('botAttackBtn');
    
    if (active) {
        document.body.classList.add('crisis-mode');
        statusBadge.textContent = 'CRITICAL DROUGHT';
        statusBadge.classList.add('critical');
        oracleCard.style.borderColor = 'var(--danger)';
        
        feeValue.textContent = impact.toString();
        feeValue.classList.add('critical');
        feeFill.style.width = (impact) + '%';
        feeFill.classList.add('critical');
        
        claimCard.classList.add('active');
        claimBtn.disabled = false;
        claimBtn.classList.add('active');
        botBtn.disabled = false;
        
        document.getElementById('droughtToggle').checked = true;
    } else {
        document.body.classList.remove('crisis-mode');
        statusBadge.textContent = 'NORMAL';
        statusBadge.classList.remove('critical');
        oracleCard.style.borderColor = '';
        
        feeValue.textContent = '0.01';
        feeValue.classList.remove('critical');
        feeFill.style.width = '0.1%';
        feeFill.classList.remove('critical');
        
        claimCard.classList.remove('active');
        claimBtn.disabled = true;
        claimBtn.classList.remove('active');
        botBtn.disabled = true;
        
        document.getElementById('droughtToggle').checked = false;
    }
}

async function checkPolicy() {
    try {
        const policy = await vaultContract.policies(userAddress);
        const active = policy[8];
        const claimed = policy[9];
        const coverage = policy[4];
        
        const statusBadge = document.getElementById('policyStatusBadge');
        const createBtn = document.getElementById('createPolicyBtn');
        const coverageEl = document.getElementById('coverageAmount');
        
        if (active) {
            statusBadge.textContent = claimed ? 'CLAIMED' : 'ACTIVE';
            statusBadge.className = 'policy-status ' + (claimed ? 'claimed' : 'active');
            coverageEl.textContent = parseFloat(ethers.utils.formatUnits(coverage, 6)).toFixed(0) + ' USD';
            createBtn.disabled = true;
            createBtn.textContent = 'Policy Active';
            
            if (claimed) {
                document.getElementById('claimBtn').disabled = true;
                document.getElementById('claimBtn').textContent = 'Claimed ✓';
            }
        } else {
            statusBadge.textContent = 'NO POLICY';
            statusBadge.className = 'policy-status';
            coverageEl.textContent = '--';
            createBtn.disabled = false;
            createBtn.textContent = 'Create Policy (1 C2FLR)';
        }
    } catch (e) {
        console.error('Policy check error:', e);
    }
}

// Toggle Drought (calls real contract)
async function toggleDrought(e) {
    if (!signer) {
        e.target.checked = !e.target.checked;
        showToast('error', 'Connect Wallet', 'Please connect your wallet first');
        return;
    }
    
    const isDrought = e.target.checked;
    const rainfall = isDrought ? 0 : 25;
    
    try {
        showLoading(isDrought ? 'Triggering drought...' : 'Clearing weather...');
        terminalLog(`[FDC] ${isDrought ? 'Drought detected' : 'Weather normalized'}: ${rainfall}mm rainfall`);
        
        const tx = await oracleContract.updateWeatherSimple(rainfall, -18512200, -44555000, { gasLimit: 200000 });
        terminalLog(`[TX] Submitted: ${tx.hash.slice(0, 14)}...`, 'highlight');
        
        await tx.wait();
        
        terminalLog(`[ORACLE] Weather updated on-chain`, 'success');
        if (isDrought) {
            terminalLog(`[HOOK] Fee increased to 50% - Pool protected`, 'warning');
        }
        
        await refreshData();
        hideLoading();
        
        if (isDrought) {
            showToast('error', '⚠️ DROUGHT DETECTED', 'FDC consensus confirmed. Defense systems activated.');
        } else {
            showToast('success', 'Weather Normalized', 'Conditions returned to normal.');
        }
    } catch (error) {
        hideLoading();
        e.target.checked = !e.target.checked;
        terminalLog(`[ERROR] ${error.message}`, 'error');
    }
}

// Simulate Bot Attack
async function simulateBotAttack() {
    if (!isDroughtActive) {
        showToast('error', 'No Opportunity', 'Activate drought first to create price gap');
        return;
    }
    
    terminalLog('[BOT] 🤖 Arbitrage bot detected...', 'warning');
    terminalLog('[BOT] Attempting to exploit price gap...', 'warning');
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 1000));
    
    terminalLog('[HOOK] ⚡ Transaction intercepted!', 'error');
    terminalLog('[HOOK] Applying 50% arbitrage capture fee...', 'error');
    
    await new Promise(r => setTimeout(r, 500));
    
    // Calculate captured amount
    const capturedAmount = 5000 + Math.random() * 5000;
    const newTreasury = treasuryAmount + capturedAmount;
    
    // Animate treasury increase
    animateValue('treasuryValue', treasuryAmount, newTreasury, 1500);
    treasuryAmount = newTreasury;
    
    terminalLog(`[HOOK] MEV Captured: ${capturedAmount.toFixed(0)} C2FLR`, 'success');
    terminalLog(`[VAULT] Funds transferred to Insurance Treasury`, 'success');
    
    showToast('error', '⛔ BOT TRAPPED', `Captured ${capturedAmount.toFixed(0)} C2FLR from arbitrage attempt`);
    
    // Update payout amount
    document.getElementById('payoutAmount').textContent = (capturedAmount / 2).toFixed(0);
}

// Create Policy
async function createPolicy() {
    if (!signer) {
        showToast('error', 'Connect Wallet', 'Please connect your wallet first');
        return;
    }
    
    try {
        showLoading('Creating policy...');
        terminalLog('[VAULT] Creating insurance policy...');
        
        const tx = await vaultContract.createPolicy(-18512200, -44555000, ethers.utils.parseUnits('5000', 6), {
            value: ethers.utils.parseEther('1'),
            gasLimit: 500000
        });
        
        terminalLog(`[TX] Submitted: ${tx.hash.slice(0, 14)}...`, 'highlight');
        await tx.wait();
        
        terminalLog('[VAULT] Policy created: $5000 coverage', 'success');
        await refreshData();
        hideLoading();
        
        showToast('success', 'Policy Created', 'Your crops are now protected!');
    } catch (error) {
        hideLoading();
        terminalLog(`[ERROR] ${error.reason || error.message}`, 'error');
        showToast('error', 'Failed', error.reason || error.message);
    }
}

// Update FTSO Price
async function updateFTSO() {
    if (!signer) {
        showToast('error', 'Connect Wallet', 'Please connect your wallet first');
        return;
    }
    
    try {
        showLoading('Fetching from FTSO...');
        terminalLog('[FTSO] Querying decentralized price feed...', 'highlight');
        
        const tx = await oracleContract.updatePriceFromFTSO({ gasLimit: 500000 });
        terminalLog(`[TX] Submitted: ${tx.hash.slice(0, 14)}...`, 'highlight');
        
        await tx.wait();
        
        terminalLog('[FTSO] Price updated from testBTC feed', 'success');
        terminalLog('[ORACLE] Base price synchronized', 'success');
        
        await refreshData();
        hideLoading();
        
        showToast('success', 'FTSO Updated', `Price: $${ftsoPrice.toLocaleString()}`);
    } catch (error) {
        hideLoading();
        terminalLog(`[ERROR] ${error.reason || error.message}`, 'error');
        showToast('error', 'FTSO Update Failed', error.reason || error.message);
    }
}

// Claim Payout
async function claimPayout() {
    if (!signer) {
        showToast('error', 'Connect Wallet', 'Please connect your wallet first');
        return;
    }
    
    try {
        showLoading('Processing claim...');
        terminalLog('[VAULT] Processing insurance claim...');
        terminalLog('[FDC] Verifying drought conditions...', 'highlight');
        terminalLog('[GPS] Verifying location hash...', 'highlight');
        
        const tx = await vaultContract.claimPayout({ gasLimit: 500000 });
        terminalLog(`[TX] Submitted: ${tx.hash.slice(0, 14)}...`, 'highlight');
        
        await tx.wait();
        
        terminalLog('[VAULT] ✅ Claim approved!', 'success');
        terminalLog('[VAULT] Payout transferred to wallet', 'success');
        
        await refreshData();
        hideLoading();
        
        showToast('success', '🎉 Payout Received!', 'Funds transferred to your wallet');
        launchConfetti();
    } catch (error) {
        hideLoading();
        terminalLog(`[ERROR] ${error.reason || error.message}`, 'error');
        showToast('error', 'Claim Failed', error.reason || error.message);
    }
}

// Utilities
function terminalLog(message, type = '') {
    const terminal = document.getElementById('terminal');
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `> ${message}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
    
    while (terminal.children.length > 50) {
        terminal.removeChild(terminal.firstChild);
    }
}

function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function showLoading(text) {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function animateValue(id, start, end, duration) {
    const el = document.getElementById(id);
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = start + range * progress;
        el.textContent = value.toFixed(2);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function launchConfetti() {
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 3 + 2,
        speedX: Math.random() * 2 - 1,
        color: ['#00d4aa', '#00dd88', '#ffaa00', '#ff3355'][Math.floor(Math.random() * 4)],
        rotation: Math.random() * 360
    }));
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += 5;
            if (p.y > canvas.height) particles.splice(i, 1);
        });
        if (particles.length > 0) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}
