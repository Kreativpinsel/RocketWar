// Show the upgrade menu overlay
function showUpgradeMenu() {
    window.showOverlay(
        `<div class="upgrade-menu-container">
            <h2>Rocket Upgrades</h2>
            <p>Coins: ${window.coins}</p>
            <p>Fuel Tank Level: ${window.fuelLevel}</p>
            <p>Max Fuel: ${window.maxFuel} <span style="color:#aaa;">→ ${100 + window.fuelLevel * 50}</span></p>
            <p>Upgrade Cost: ${window.fuelUpgradeCost * window.fuelLevel} coins</p>
            <button onclick="upgradeFuelTank()" ${window.coins < window.fuelUpgradeCost * window.fuelLevel ? 'disabled' : ''}>Upgrade Fuel Tank</button>
            <hr>
            <p>Shield Duration: ${window.shieldDuration}s (Level ${window.shieldUpgradeLevel}) <span style="color:#aaa;">→ ${5 + window.shieldUpgradeLevel * 2}s</span></p>
            <p>Upgrade Cost: ${window.shieldUpgradeCost * window.shieldUpgradeLevel} coins</p>
            <button onclick="upgradeShield()" ${window.coins < window.shieldUpgradeCost * window.shieldUpgradeLevel ? 'disabled' : ''}>Upgrade Shield</button>
            <hr>
            <p>Wormhole Duration: ${window.wormholeDuration}s (Level ${window.wormholeUpgradeLevel}) <span style="color:#aaa;">→ ${5 + window.wormholeUpgradeLevel * 2}s</span></p>
            <p>Upgrade Cost: ${window.wormholeUpgradeCost * window.wormholeUpgradeLevel} coins</p>
            <button onclick="upgradeWormhole()" ${window.coins < window.wormholeUpgradeCost * window.wormholeUpgradeLevel ? 'disabled' : ''}>Upgrade Wormhole</button>
            <button onclick="window.showMenu()">Back</button>
        </div>`
    );
}

// Upgrade logic
function upgradeFuelTank() {
    let cost = window.fuelUpgradeCost * window.fuelLevel;
    if (window.coins >= cost) {
        window.coins -= cost;
        window.fuelLevel++;
        window.maxFuel = 100 + (window.fuelLevel - 1) * 50;
        window.fuel = window.maxFuel;
        if (typeof window.startFuelSpawning === "function") window.startFuelSpawning();
        showUpgradeMenu();
        window.saveProgress();
    }
}
// haha you found me ( ͡° ͜ʖ ͡°)
function upgradeShield() {
    let cost = window.shieldUpgradeCost * window.shieldUpgradeLevel;
    if (window.coins >= cost) {
        window.coins -= cost;
        window.shieldUpgradeLevel++;
        window.shieldDuration = 5 + (window.shieldUpgradeLevel - 1) * 2;
        // Update active shield duration if present
        if (window.collectedPowerUps) {  // Add null check
            let shieldPU = window.collectedPowerUps.find(pu => pu.type === "shield");
            if (shieldPU) shieldPU.duration = window.shieldDuration;
        }
        showUpgradeMenu();
        window.saveProgress();
    }
}

function upgradeWormhole() {
    let cost = window.wormholeUpgradeCost * window.wormholeUpgradeLevel;
    if (window.coins >= cost) {
        window.coins -= cost;
        window.wormholeUpgradeLevel++;
        window.wormholeDuration = 5 + (window.wormholeUpgradeLevel - 1) * 2;
        showUpgradeMenu();
        window.saveProgress();
    }
}

window.showUpgradeMenu = showUpgradeMenu;
window.upgradeFuelTank = upgradeFuelTank;
window.upgradeShield = upgradeShield;
window.upgradeWormhole = upgradeWormhole;


