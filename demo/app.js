// Contract Addresses
const CONTRACTS = {
    WEATHER_ORACLE: '0x223163b9109e43BdA9d719DF1e7E584d781b93fd',
    INSURANCE_VAULT: '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438',
    FBTC: '0x8C691A99478D3b3fE039f777650C095578debF12',
    COFFEE: '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c',
};

const RPC_URL = 'https://coston2-api.flare.network/ext/C/rpc';

// State
let provider;
let signer;
let userAddress;
let priceChart;
let isDroughtActive = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    setupEventListeners();
    updateUI();
});

// Chart Setup
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['0s', '10s', '20s', '30s', '40s', '50s', '60s'],
            datasets: [
                {
                    label: 'Pool Price',
                    data: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
                    borderColor: '#00aaff',
                    backgroundColor: 'rgba(0, 170, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: 'Oracle Price',
                    data: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
                    borderColor: '#ff8800',
                    backgroundColor: 'rgba(255, 136, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 4,
                    max: 8,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                }
            }
        }
    });
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('droughtToggle').addEventListener('change', toggleDrought);
    document.getElementById('botButton').addEventListener('click', simulateBotAttack);
    document.getElementById('claimButton').addEventListener('click', processClaim);
}

// Connect Wallet
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showToast('error', 'MetaMask Not Found', 'Please install MetaMask to continue');
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Update UI
        const btn = document.getElementById('connectWallet');
        btn.querySelector('.wallet-text').textContent = 
            userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        
        // Load balance
        await updateBalance();
        
        showToast('success', 'Wallet Connected', `Connected to ${userAddress.slice(0, 10)}...`);
        addTerminalLog(`Wallet connected: ${userAddress.slice(0, 10)}...`);
    } catch (error) {
        showToast('error', 'Connection Failed', error.message);
    }
}

// Update Balance
async function updateBalance() {
    if (!signer) return;

    try {
        const fbtcContract = new ethers.Contract(
            CONTRACTS.FBTC,
            ['function balanceOf(address) view returns (uint256)'],
            provider
        );

        const balance = await fbtcContract.balanceOf(userAddress);
        const formatted = ethers.utils.formatEther(balance);
        
        document.getElementById('walletBalance').textContent = parseFloat(formatted).toFixed(2);
        document.getElementById('balanceUsd').textContent = 
            '$' + (parseFloat(formatted) * 45000).toFixed(2) + ' USD';
    } catch (error) {
        console.error('Balance update failed:', error);
    }
}

// Toggle Drought
async function toggleDrought(event) {
    const isChecked = event.target.checked;
    
    if (isChecked) {
        // Activate drought
        isDroughtActive = true;
        document.body.classList.add('critical-state');
        
        // Update UI
        document.getElementById('weatherStatus').textContent = 'CRITICAL DROUGHT';
        document.getElementById('weatherStatus').classList.add('critical');
        document.getElementById('rainfall').textContent = '0 mm';
        document.getElementById('rainfall').style.color = '#ff4444';
        document.getElementById('feeBadge').textContent = '50.00%';
        document.getElementById('feeBadge').classList.add('critical');
        document.getElementById('currentFee').textContent = '50.00%';
        document.getElementById('currentFee').classList.add('critical');
        
        // Update chart
        updateChart(7.5);
        
        // Enable claim button
        const claimBtn = document.getElementById('claimButton');
        claimBtn.disabled = false;
        claimBtn.classList.add('enabled');
        
        addTerminalLog('[FDC] Drought detected: 0mm rainfall');
        addTerminalLog('[ORACLE] Price adjusted: +50%');
        addTerminalLog('[HOOK] Fee increased to 50%');
        
        showToast('warning', 'Drought Detected', 'FDC consensus confirmed severe drought. Defense systems activated.');
        
    } else {
        // Deactivate drought
        isDroughtActive = false;
        document.body.classList.remove('critical-state');
        
        // Reset UI
        document.getElementById('weatherStatus').textContent = 'NORMAL';
        document.getElementById('weatherStatus').classList.remove('critical');
        document.getElementById('rainfall').textContent = '45 mm';
        document.getElementById('rainfall').style.color = '';
        document.getElementById('feeBadge').textContent = '0.01%';
        document.getElementById('feeBadge').classList.remove('critical');
        document.getElementById('currentFee').textContent = '0.01%';
        document.getElementById('currentFee').classList.remove('critical');
        
        // Update chart
        updateChart(5.0);
        
        addTerminalLog('[SYSTEM] Weather normalized');
    }
}

// Update Chart
function updateChart(oraclePrice) {
    const poolPrice = 5.0;
    priceChart.data.datasets[1].data = [
        poolPrice, poolPrice, poolPrice, poolPrice, poolPrice, poolPrice, oraclePrice
    ];
    priceChart.update();
}

// Simulate Bot Attack
async function simulateBotAttack() {
    if (!isDroughtActive) {
        showToast('warning', 'No Arbitrage Opportunity', 'Activate drought first to create price gap');
        return;
    }

    addTerminalLog('[BOT] Arbitrage attempt detected');
    addTerminalLog('[HOOK] Intercepting transaction...');
    
    // Simulate transaction
    setTimeout(() => {
        const capturedValue = 5000;
        const currentTreasury = parseInt(document.getElementById('treasuryValue').textContent.replace(/,/g, ''));
        const newTreasury = currentTreasury + capturedValue;
        
        animateValue('treasuryValue', currentTreasury, newTreasury, 1000);
        
        addTerminalLog('[HOOK] MEV Captured: 5,000 FBTC');
        addTerminalLog('[VAULT] Funds transferred to insurance treasury');
        
        const mockTxHash = '0x' + Array(64).fill(0).map(() => 
            Math.floor(Math.random() * 16).toString(16)).join('');
        
        showToast('error', 'Transaction Intercepted', 
            'Bot attack neutralized. 50% fee applied.', mockTxHash);
    }, 1500);
}

// Process Claim
async function processClaim() {
    if (!signer) {
        showToast('error', 'Wallet Not Connected', 'Please connect your wallet first');
        return;
    }

    try {
        addTerminalLog('[CLAIM] Processing payout request...');
        
        // Simulate transaction
        const mockTxHash = '0x' + Array(64).fill(0).map(() => 
            Math.floor(Math.random() * 16).toString(16)).join('');
        
        showToast('success', 'Transaction Submitted', 
            'Processing claim...', mockTxHash);
        
        // Simulate confirmation
        setTimeout(async () => {
            // Update balance
            const currentBalance = parseFloat(document.getElementById('walletBalance').textContent);
            const newBalance = currentBalance + 5000;
            animateValue('walletBalance', currentBalance, newBalance, 2000);
            
            // Update status
            document.getElementById('policyStatus').textContent = 'PAID';
            document.getElementById('policyStatus').classList.add('paid');
            document.getElementById('claimButton').disabled = true;
            document.getElementById('claimButton').classList.remove('enabled');
            
            addTerminalLog('[VAULT] Payout processed: 5,000 FBTC');
            addTerminalLog('[CLAIM] Insurance claim completed');
            
            showToast('success', 'Claim Processed', 
                'Received 5,000 FBTC payout', mockTxHash);
            
            // Trigger confetti
            launchConfetti();
        }, 2000);
        
    } catch (error) {
        showToast('error', 'Claim Failed', error.message);
    }
}

// Show Toast
function showToast(type, title, message, txHash = null) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '⛔',
        warning: '⚠'
    };
    
    let html = `
        <div class="toast-header">
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-title">${title}</span>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    if (txHash) {
        html += `<div class="toast-hash">Tx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}</div>`;
    }
    
    toast.innerHTML = html;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Add Terminal Log
function addTerminalLog(message) {
    const terminal = document.getElementById('terminal');
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.textContent = `> ${message}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
    
    // Keep only last 10 lines
    while (terminal.children.length > 10) {
        terminal.removeChild(terminal.firstChild);
    }
}

// Animate Value
function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
    }, 16);
}

// Confetti Animation
function launchConfetti() {
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#00ff88', '#00aaff', '#ff8800', '#ffffff'];
    
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, index) => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
            
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            
            if (p.y > canvas.height) {
                particles.splice(index, 1);
            }
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    animate();
}

// Update UI periodically
function updateUI() {
    // Simulate real-time updates
    setInterval(() => {
        if (!isDroughtActive) {
            const temp = 27 + Math.random() * 2 - 1;
            document.getElementById('temperature').textContent = temp.toFixed(1) + '°C';
        }
    }, 5000);
}
