# Agri-Hook Demo Frontend

Professional glassmorphism UI for the 2-minute Agri-Hook demo presentation.

## Features

- **Glassmorphism Design** - Modern, professional UI with blur effects
- **Real-time Updates** - Live price charts and status indicators
- **Beautiful Toasts** - Transaction notifications with hash display
- **Confetti Animation** - Celebration effect on successful claim
- **Responsive Layout** - Two-column layout (Farmer View | Protocol War Room)
- **MetaMask Integration** - Wallet connection support

## Demo Flow (2 Minutes)

### Scene 1: The Hook (0:00 - 0:20)
- Dashboard loads in "Normal" mode
- Green/dark color scheme
- Narrator explains the $800M DeFi problem

### Scene 2: The Setup (0:20 - 0:40)
- Hover over Farmer View (left column)
- Click "Connect Wallet"
- MetaMask popup appears
- Wallet connects successfully

### Scene 3: The Event (0:40 - 1:00)
- Toggle "SIMULATE DROUGHT" switch
- Screen borders turn RED
- Status changes to "CRITICAL DROUGHT"
- Orange line (Oracle) spikes up on chart
- Fee changes from 0.01% to 50.00%

### Scene 4: The Trap (1:00 - 1:25)
- Click "SIMULATE BOT ATTACK" button
- Toast notification: "Transaction Intercepted"
- Treasury value counts up (+5,000 FBTC)
- Terminal log shows MEV capture

### Scene 5: The Payout (1:25 - 1:50)
- "Claim Payout" button glows (enabled)
- Click button
- MetaMask confirmation
- Confetti animation
- Wallet balance increases
- Status changes to "PAID"

## Setup

1. Open `index.html` in a modern browser
2. Ensure MetaMask is installed
3. Connect to Flare Coston2 network

## Files

- `index.html` - Main HTML structure
- `styles.css` - Glassmorphism styling
- `app.js` - Interactive functionality

## Contract Addresses (Coston2)

```javascript
WEATHER_ORACLE: 0x223163b9109e43BdA9d719DF1e7E584d781b93fd
INSURANCE_VAULT: 0x6c6ad692489a89514bD4C8e9344a0Bc387c32438
FBTC: 0x8C691A99478D3b3fE039f777650C095578debF12
COFFEE: 0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c
```

## Design Principles

- **No Emojis in UI** - Professional appearance
- **Glassmorphism** - Frosted glass effect with blur
- **Clear Hierarchy** - Important info stands out
- **Smooth Animations** - Professional transitions
- **Transaction Feedback** - Clear toast notifications with tx hash

## Color Scheme

- Background: Dark (#0a0e1a)
- Accent Green: #00ff88 (success, normal state)
- Accent Red: #ff4444 (critical, errors)
- Accent Orange: #ff8800 (warnings, oracle)
- Accent Blue: #00aaff (info, pool price)

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires ES6+ support
