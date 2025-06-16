/*!
 * RocketWar v1.0.0
 * Copyright (c) 2023-2025 APPA
 * MIT License - See LICENSE file
 */
// --- Rocket War Game Script ---
    (function() {
        // --- Game Variables ---
        let canvas= document.getElementById('canvas');
        let ctx = canvas.getContext('2d');
        let KEY_SPACE = false, KEY_UP = false, KEY_DOWN = false;

        const GAME_VERSION = "1.0.0";

        let hits = 0, highscore = 0, gameRunning = true, BoostCooldown = 2500, canBoost = true, canShoot = true;
        let shootCooldown = 500, difficultyLevel = 1, createufosInterval, hitsUntilNextDifficulty = 0;
        let baseSpawnInterval = 5000, baseRocketSpeed = 2.5, selectedRocket = 0, isBoosting = false, boostDuration = 1000;
        let gameStarted = false, imagesLoaded = false;
        const WORMHOLE_HEIGHT = 30; 
        const shootSound = new Audio('Sounds/shoot.mp3');
        const explosionSound = new Audio('Sounds/explosion.mp3');
        const bgMusic = new Audio('Sounds/music.mp3');
        const pauseSound = new Audio('Sounds/pause.mp3');
        bgMusic.loop = true;
        let scoreFeedbacks = [];
        let isMuted = false;
        let isPaused = JSON.parse(localStorage.getItem('paused')) || false;
        let rocketPage = 0;
        const rocketsPerPage = 3;
        let backgroundOffset = 0;
        const backgroundScrollSpeed = 1.5;
        let bossUfo = null;
        let bossesDefeated = 0;
        let bossSpawnHandled = false; // Prevent multiple boss spawns at same hit count
        let survivalTime = 0;
        let shieldHitPending = false;
        let asteroids = [];
        let asteroidSpawnInterval = null;
        let fuelSpawnInterval = null;
        let gameScale = 1;
        let lastFrameTime = 0;
        const TARGET_FPS = 60;
        const FRAME_TIME = 1000 / TARGET_FPS;

        window.shieldActive = false;
        window.shieldTimer = 0;
        window.shieldDuration = 5; // seconds, base value
        window.shieldUpgradeLevel = 1;
        window.shieldUpgradeCost = 10;

        window.wormholeActive = false;
        window.wormholeTimer = 0;
        window.wormholeDuration = 5; // seconds, base value
        window.wormholeUpgradeLevel = 1;
        window.wormholeUpgradeCost = 10;

        window.coins = 0;
        window.fuelLevel = 1;
        window.maxFuel = 100;
        window.fuel = 100;
        window.fuelUpgradeCost = 10;
        

        // --- Image Paths ---
        const imagePaths = {
            background: 'BilderSpiel/Stars.jpg',
            rockets: [
                'BilderSpiel/Rocket.png',
                'BilderSpiel/Rocket2.png',
                'BilderSpiel/Rocket3.png',
                'BilderSpiel/Rocket4.png',
                'BilderSpiel/Rocket5.png',
                'BilderSpiel/Rocket6.png'
            ],
            ufo: 'BilderSpiel/UFO.png',
            bossUfo: 'BilderSpiel/bossUfo.png',
            bullet: 'BilderSpiel/Bullet.png',
            explosion: 'BilderSpiel/Explosion.png',
            lowFuel: 'BilderSpiel/LowFuel.png',
            fuel: 'BilderSpiel/Fuel.png',
            asteroid: 'BilderSpiel/Asteroid.png'
        };

        let images = {
            background: new Image(),
            rockets: Array(imagePaths.rockets.length).fill(null).map(() => new Image()),
            ufo: new Image(),
            bossUfo: new Image(),
            bullet: new Image(),
            explosion: new Image(),
            lowFuel: new Image(),
            fuel: new Image(),
            asteroid: new Image()
        };

        let rocket = {
            x: 50 ,
            y: 200 ,
            width: 150 ,
            height: 65 ,
            isExploding: false,
            explosionTimer: 0
        };

        let ufos = [];
        let bullets = [];
        let powerUps = [];
        let fuels = [];
        let powerUpSpawnInterval = null; 
        let collectedPowerUps = [];


        let missions = [
            { id: "destroyer", desc: "Destroy 10 UFOs", completed: false, progress: 0, goal: 10, reward: 5 },
            { id: "survivor", desc: "Survive for 2 minutes", completed: false, progress: 0, goal: 120, reward: 10 }, // goal in seconds
            { id: "firstBoss", desc: "Defeat the Boss UFO", completed: false, reward: 15 },
            { id: "fuelCollector", desc: "Collect 5 Fuel Packs", completed: false, progress: 0, goal: 5, reward: 5 },
            { id: "highRoller", desc: "Score 50 Hits", completed: false, progress: 0, goal: 50, reward: 20 },
            { id: "bigMoney", desc: "Collect 100 Coins", completed: false, progress: 0, goal: 100, reward: 10 }
        ]

        let dailyMissions = [
            { id: "dailyMission", name: "Destroy 100 UFOs", completed: false, progress: 0, goal: 100, reward: 10 }
        ];

        
        loadProgress();

        // --- Image Loading ---
        function loadImages() {
            let loadedCount = 0;
            const totalImages = Object.keys(imagePaths).reduce((count, key) => {
                return count + (Array.isArray(imagePaths[key]) ? imagePaths[key].length : 1);
            }, 0);

            function handleImageLoad() {
                loadedCount++;
                console.log(`Loaded ${loadedCount}/${totalImages} images`);
                if (loadedCount === totalImages) {
                    console.log('All images loaded');
                    imagesLoaded = true;
                    hideOverlay();
                    showNewGameMenu();
                }
            }

            function handleImageError(imageName) {
                console.error(`Failed to load image: ${imageName}`);
                loadedCount++; // Count errors as loaded to prevent hanging
                if (loadedCount === totalImages) {
                    imagesLoaded = true;
                    hideOverlay();
                    showNewGameMenu();
                }
            }

            // Load background
            images.background.onload = handleImageLoad;
            images.background.onerror = () => handleImageError('background');
            images.background.src = imagePaths.background;

            // Load rockets
            imagePaths.rockets.forEach((path, index) => {
                images.rockets[index].onload = handleImageLoad;
                images.rockets[index].onerror = () => handleImageError(`rocket${index}`);
                images.rockets[index].src = path;
            });

            // Load other images
            ['ufo', 'bossUfo', 'bullet', 'explosion', 'lowFuel', 'fuel', 'asteroid'].forEach(key => {
                images[key].onload = handleImageLoad;
                images[key].onerror = () => handleImageError(key);
                images[key].src = imagePaths[key];
            });
        }

        // --- Keyboard Controls ---
        document.addEventListener('keydown', function(e) {
            switch(e.keyCode) {
                case 32: e.preventDefault(); KEY_SPACE = true; break;
                case 38: e.preventDefault(); KEY_UP = true; break;
                case 40: e.preventDefault(); KEY_DOWN = true; break;
                case 88: boost(); break;
                case 70: toggleFullScreen(); break;
                case 80: togglePause(); break;
            }
        });
        document.addEventListener('keyup', function(e) {
            switch(e.keyCode) {
                case 32: KEY_SPACE = false; break;
                case 38: KEY_UP = false; break;
                case 40: KEY_DOWN = false; break;
                case 88: break;
            }
        });

        // --- Overlay Functions ---
        function showOverlay(contentHtml, buttonsHtml = '') {
            if (!isMuted) {
                pauseSound.currentTime = 0;
                pauseSound.play();
            };
            document.getElementById('overlayContent').innerHTML = contentHtml;
            document.getElementById('overlayButtons').innerHTML = buttonsHtml;
            const overlay = document.getElementById('gameOverlay');
            overlay.style.display = 'flex';
            overlay.focus();
        }
        function hideOverlay() {
            document.getElementById('gameOverlay').style.display = 'none';
            document.getElementById('overlayContent').innerHTML = '';
            document.getElementById('overlayButtons').innerHTML = '';
        }

        // --- Mission UI ---
        function showMissionsMenu() {
            let html = `<h2>Missions</h2><ul>`;
            missions.forEach(m => {
                html += `<li>${m.desc} - ${m.completed ? "✅" : (m.progress !== undefined ? `${m.progress}/${m.goal}` : "❌")}</li>`;
            });
            html += `</ul>
            <button onclick="showMenu()">Back</button>
            <button onclick="showDailyMissionsMenu()">Daily Mission</button>`;
            showOverlay(html);
        }

        // --- Game State Functions ---
        function resetGame() {
            hideOverlay();
            rocket.x = 50;
            rocket.y = canvas.height / 2 - rocket.height / 2;
            rocket.speed = baseRocketSpeed;
            rocket.isExploding = false;
            rocket.explosionTimer = 0;
            hits = 0;
            ufos = [];
            bullets = [];
            difficultyLevel = 1;
            hitsUntilNextDifficulty = 0;
            isBoosting = false;
            canBoost = true;
            canShoot = true;
            bossUfo = null;
            survivalTime = 0;
            fuel = maxFuel;
            shieldHitPending = false;
        }

        function clearAllIntervals() {
            if (createufosInterval) {
                clearInterval(createufosInterval);
                createufosInterval = null;
            }
            if (fuelSpawnInterval) {
                clearInterval(fuelSpawnInterval);
                fuelSpawnInterval = null;
            }
            if (powerUpSpawnInterval) {
                clearInterval(powerUpSpawnInterval);
                powerUpSpawnInterval = null;
            }
            if (asteroidSpawnInterval) {
                clearInterval(asteroidSpawnInterval);
                asteroidSpawnInterval = null;
            }   
        }

       // Add this with other utility functions
        function isMobileDevice() {
            return (
                navigator.userAgent.match(/Android/i) ||
                navigator.userAgent.match(/webOS/i) ||
                navigator.userAgent.match(/iPhone/i) ||
                navigator.userAgent.match(/iPad/i) ||
                navigator.userAgent.match(/iPod/i) ||
                navigator.userAgent.match(/BlackBerry/i) ||
                navigator.userAgent.match(/Windows Phone/i) ||
                ('ontouchstart' in window) ||
                (window.innerWidth <= 768)
            );
        }

        function startNewGame() {
            if (!imagesLoaded) {
                console.log('Images still loading, please wait...');
                return;
            }
            clearAllIntervals(); 
            resetGame();
            bgMusic.currentTime = 0;
            if (!isMuted) bgMusic.play();
            gameStarted = true;
            gameRunning = true;
            hideOverlay();
            startSpawning();
            const spawnInterval = Math.max(1000, baseSpawnInterval - (difficultyLevel - 1) * 400);
            createufosInterval = setInterval(createufos, spawnInterval);
        }

        function togglePause() {
            // Only allow pausing/resuming if the game has started and is running
            if (!gameStarted || !gameRunning || rocket.isExploding) return;
            isPaused = !isPaused;
            localStorage.setItem('paused', JSON.stringify(isPaused));
            if (isPaused) {
                clearAllIntervals();
                showOverlay(
                    `<p>PAUSED</p>`,
                    `<button onclick="togglePause()" aria-label="Resume">Resume</button>
                     <button onclick="showMenu()" aria-label="Main Menu">Main Menu</button>
                     <button onclick="showSoundMenu()" aria-label="Sound Menu">Sound Menu</button>
                     <button onclick="showMissionsMenu()">Missions</button>`
                );
            } else {
                clearAllIntervals(); // <-- Add this line for safety!
                const spawnInterval = Math.max(1000, baseSpawnInterval - (difficultyLevel - 1) * 400);
                createufosInterval = setInterval(createufos, spawnInterval);
                startSpawning();
                hideOverlay();
            }
        }

        function toggleFullScreen() {
            if (!document.fullscreenElement) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.webkitRequestFullscreen) { // iOS Safari
                    document.documentElement.webkitRequestFullscreen();
                }
                screen.orientation.lock('landscape').catch(() => {
                    // Silently fail if orientation lock is not supported
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { // iOS Safari
                    document.webkitExitFullscreen();
                }
            }
            resizeCanvas(); // Make sure to resize after fullscreen change
        }

        function toggleMute() {
            isMuted = !isMuted;
            bgMusic.muted = isMuted;
            shootSound.muted = isMuted;
            explosionSound.muted = isMuted;
            const muteBtn = document.getElementById('muteBtn');
            if (muteBtn) muteBtn.textContent = isMuted ? "🔇" : "🔊";
        }

        // --- Game Menus ---
        function showNewGameMenu() {
            showOverlay(
                `<p>Welcome to Rocket War!</p>
                <p>Use UP/DOWN arrows to move, SPACE to shoot, X to boost.</p>
                <p>F for Fullscreen, P to pause</p>
                <img id="selectedRocketImage" src="" alt="selectedRocket">`,
                `<button onclick="startNewGame()" aria-label="Start Game">Start Game</button>
                 <button onclick="showChooseRocketMenu()" aria-label="Choose Rocket">Choose Rocket</button>
                 <button onclick="showLeaderboard()" aria-label="Leaderboard">Leaderboard</button>
                 <button onclick="showSoundMenu()" aria-label="Sound Menu">Sound Menu</button>
                 <button onclick="showMissionsMenu()">Missions</button>
                 <button onclick="showUpgradeMenu()" aria-label="Upgrades">Upgrades</button>`
            );
            updateSelectedRocketImage();
        }

        function showMenu() {
            showOverlay(
                `<p>Game Menu</p>
                <img id="selectedRocketImage" src="" alt="selectedRocket">`,
                `<button onclick="startNewGame()" aria-label="Play Again">Play Again</button>
                <button onclick="showChooseRocketMenu()" aria-label="Choose Rocket">Choose Rocket</button>
                <button onclick="showLeaderboard()" aria-label="Leaderboard">Leaderboard</button>
                <button onclick="showSoundMenu()" aria-label="Sound Menu">Sound Menu</button>
                <button onclick="showMissionsMenu()">Missions</button>
                <button onclick="showUpgradeMenu()" aria-label="Upgrades">Upgrades</button>
                <button onclick="if(confirm('Are you sure? This will reset ALL progress!')) resetAllProgress()" 
                        style="background-color: #ff4444;">Reset All Progress</button>`
            );
            updateSelectedRocketImage();
        }


        function showChooseRocketMenu() {
            const unlockedRockets = Math.floor(highscore / 10) + 1;
            const totalRockets = imagePaths.rockets.length;
            const maxPage = Math.ceil(totalRockets / rocketsPerPage) - 1;
            const start = rocketPage * rocketsPerPage;
            const end = Math.min(start + rocketsPerPage, totalRockets);

            let rocketsHtml = '';
            for (let i = start; i < end; i++) {
                const unlocked = i < unlockedRockets;
                rocketsHtml += `
                    <div class="rocket-preview${selectedRocket === i ? ' selected' : ''} ${unlocked ? '' : 'locked'}"
                         onclick="${unlocked ? `changeRocket(${i})` : ''}">
                        <img src="${imagePaths.rockets[i]}" alt="Rocket ${i + 1}" style="${unlocked ? '' : 'filter: grayscale(1); opacity: 0.5;'}">
                        <p>Rocket ${i + 1}${selectedRocket === i ? ' (Selected)' : ''}${unlocked ? '' : ' (Locked)'}</p>
                    </div>
                `;
            }

            let navButtons = '';
            navButtons += `<button onclick="prevRocketPage()" aria-label="Previous Rockets" ${rocketPage === 0 ? 'disabled' : ''}>Previous</button>`;
            navButtons += `<button onclick="nextRocketPage()" aria-label="Next Rockets" ${rocketPage === maxPage ? 'disabled' : ''}>Next</button>`;

            showOverlay(
                `<p>Choose Your Rocket</p>
                 <div style="display: flex; gap: 20px; margin: 20px;">
                    ${rocketsHtml}
                 </div>`,
                `${navButtons}
                 <button onclick="showMenu()" aria-label="Back">Back</button>`
            );
        }

        function changeRocket(newRocketIndex){
            selectedRocket = newRocketIndex;
            resetGame();
            showMenu();
            updateSelectedRocketImage();
        }

        function updateSelectedRocketImage(){
            const selectedRocketImage = document.getElementById('selectedRocketImage');
            if (selectedRocketImage && imagesLoaded) {
                selectedRocketImage.src = imagePaths.rockets[selectedRocket];
            }
        }

        function showSoundMenu() {
            showOverlay(
                `<h2>Sound Settings</h2>
                <label>Music Volume: <input type="range" min="0" max="1" step="0.01" value="${bgMusic.volume}" onchange="setMusicVolume(this.value)"></label><br>
                <label>Effects Volume: <input type="range" min="0" max="1" step="0.01" value="${shootSound.volume}" onchange="setEffectsVolume(this.value)"></label><br>
                <button onclick="toggleMute()" aria-label="Mute or Unmute Sound" id="muteBtn">${isMuted ? "🔇" : "🔊"}</button>`,
                `<button onclick="showMenu()">Back</button>`
            );
        }

        function setMusicVolume(volume) {
            bgMusic.volume = volume;
            localStorage.setItem('musicVolume', volume);
        }

        function setEffectsVolume(volume) {
            shootSound.volume = volume;
            explosionSound.volume = volume;
            localStorage.setItem('effectsVolume', volume);
        }

        // --- Leaderboard ---
        function saveScore(name, score) {
            let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
            leaderboard.push({ name, score });
            leaderboard.sort((a, b) => b.score - a.score);
            leaderboard = leaderboard.slice(0, 10);
            localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
        }

        function showLeaderboard() {
            let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
            let html = '<h2>Leaderboard</h2><ol>';
            leaderboard.forEach(entry => {
                html += `<li>${entry.name}: ${entry.score}</li>`;
            });
            html += '</ol><button onclick="showMenu()" aria-label="Back">Back</button>';
            showOverlay(html);
        }

        function submitScore(event) {
            event.preventDefault();
            const playerName = document.getElementById('playerName').value.trim();
            if (playerName.length === 0) {
                alert('Please enter a valid name.');
                return;
            }
            saveScore(playerName, hits);
            showLeaderboard();
        }

        function nextRocketPage() {
            const totalRockets = imagePaths.rockets.length;
            const maxPage = Math.ceil(totalRockets / rocketsPerPage) - 1;
            if (rocketPage < maxPage) {
                rocketPage++;
                showChooseRocketMenu();
            }
        }

        function prevRocketPage() {
            if (rocketPage > 0) {
                rocketPage--;
                showChooseRocketMenu();
            }
        }

        // --- Game Logic ---
        function boost() {
            if(canBoost && !isBoosting && gameRunning && !rocket.isExploding) {
                isBoosting = true;
                canBoost = false;
                setTimeout(() =>{ isBoosting = false; }, boostDuration);
                setTimeout(() => { canBoost = true; }, BoostCooldown);
            }
        }

        function createBullet() {
            if (KEY_SPACE && canShoot && gameRunning && !rocket.isExploding) {
                bullets.push({
                    x: rocket.x + rocket.width - 10 * gameScale,
                    y: rocket.y + rocket.height / 2 - 12 * gameScale,
                    width: 50 * gameScale,
                    height: 25 * gameScale,
                    speed: 12 
                });
                if (images.bullet.complete && images.bullet.naturalWidth > 0) {
                    shootSound.currentTime = 0;
                    shootSound.play();
                }
                canShoot = false;
                setTimeout(() => { canShoot = true; }, shootCooldown);
            }
        }

        function createufos() {
            if (!gameRunning) return;
            
            const scale = isMobileDevice() ? gameScale : 1;
            ufos.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 85),
                width: 150 * scale,
                height: 85 * scale,
                speed: 3 + difficultyLevel * 0.25,
                isExploding: false,
                explosionTimer: 0
            });
        }

        function checkCollisions() {
            if (!gameRunning) return;
            // Rocket-UFO collision
            for (let ufoIndex = ufos.length - 1; ufoIndex >= 0; ufoIndex--) {
                const ufo = ufos[ufoIndex];
                if (!rocket.isExploding &&
                    rocket.x < ufo.x + ufo.width &&
                    rocket.x + rocket.width > ufo.x &&
                    rocket.y < ufo.y + ufo.height &&
                    rocket.y + rocket.height > ufo.y) {
                        if (shieldActive && !shieldHitPending) {
                            // Remove shield and survive
                            shieldHitPending = true;
                            
                            // Destroy the UFO as if hit by a bullet
                            ufo.isExploding = true;
                            ufo.explosionTimer = 30;
                            explosionSound.currentTime = 0;
                            explosionSound.play();
                            scoreFeedbacks.push({ x: ufo.x, y: ufo.y, value: "+1 (Shield)", alpha: 1 });
                            hits++;
                            // ...mission logic...
                            let daily = dailyMissions.find(m => m.id === "dailyMission");
                            if (daily && !daily.completed) {
                                daily.progress++;
                                if (daily.progress >= daily.goal) {
                                    daily.completed = true;
                                    coins += daily.reward;
                                    scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${daily.reward} coins (Daily!)`, alpha: 1 });
                                    saveProgress();
                                }
                            }
                            let mDestroyer = missions.find(m => m.id === "destroyer");
                            if (mDestroyer && !mDestroyer.completed) {
                                mDestroyer.progress++;
                                if (mDestroyer.progress >= mDestroyer.goal) {
                                    mDestroyer.completed = true;
                                    coins += mDestroyer.reward;
                                    let coinReward = 1; // or whatever the base reward is
                                    
                                    coins += coinReward;
                                    scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${mDestroyer.reward} coins (Mission!)`, alpha: 1 });
                                    checkBigMoneyMission();
                                    saveProgress();
                                }
                            }
                            let mHighRoller = missions.find(m => m.id === "highRoller");
                            if (mHighRoller && !mHighRoller.completed) {
                                mHighRoller.progress++;
                                if (mHighRoller.progress >= mHighRoller.goal) {
                                    mHighRoller.completed = true;
                                    coins += mHighRoller.reward;
                                    let coinReward = 1; // or whatever the base reward is
                                    
                                    coins += coinReward;
                                    scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${mHighRoller.reward} coins (Mission!)`, alpha: 1 });
                                    checkBigMoneyMission();
                                    saveProgress();
                                }
                            }
                            hitsUntilNextDifficulty++;
                            if (hits > highscore) highscore = hits;
                            if (hitsUntilNextDifficulty >= 10) {
                                increaseDifficulty();
                                hitsUntilNextDifficulty = 0;
                            }
                            ufos.splice(ufoIndex, 1); // Remove UFO immediately!
                            setTimeout(() => {
                                shieldActive = false;
                                shieldTimer = 0;
                                collectedPowerUps = collectedPowerUps.filter(pu => pu.type !== "shield");
                                shieldHitPending = false;
                            }, 500);
                            return; // Survive the hit, no explosion
                        }
                    

                    // Normal death logic
                    rocket.isExploding = true;
                    rocket.explosionTimer = 60;
                    ufos.splice(ufoIndex, 1);
                    setTimeout(() => { gameOver(); }, 1000);
                    return;
                }
            }

            // Rocket-Boss collision
            if (bossUfo && !rocket.isExploding &&
                rocket.x < bossUfo.x + bossUfo.width &&
                rocket.x + rocket.width > bossUfo.x &&
                rocket.y < bossUfo.y + bossUfo.height &&
                rocket.y + rocket.height > bossUfo.y) {
                    if (shieldActive && !shieldHitPending) {
                        shieldHitPending = true;
                        
                        setTimeout(() => {
                            shieldActive = false;
                            shieldTimer = 0;
                            collectedPowerUps = collectedPowerUps.filter(pu => pu.type !== "shield");
                            shieldHitPending = false;
                        }, 500);
                        return; // Survive the hit, no explosion
                    }
                


                rocket.isExploding = true;
                rocket.explosionTimer = 60;
                setTimeout(() => { gameOver(); }, 1000);
                return;
            }
            // Asteroid collision
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const ast = asteroids[i];
                if (!rocket.isExploding &&
                    rocket.x < ast.x + ast.width &&
                    rocket.x + rocket.width > ast.x &&
                    rocket.y < ast.y + ast.height &&
                    rocket.y + rocket.height > ast.y) {
                    if (shieldActive && !shieldHitPending) {
                        shieldHitPending = true;
                        setTimeout(() => {
                            shieldActive = false;
                            shieldTimer = 0;
                            collectedPowerUps = collectedPowerUps.filter(pu => pu.type !== "shield");
                            shieldHitPending = false;
                        }, 500);
                        asteroids.splice(i, 1); // Optionally remove asteroid on shield hit
                        return;
                    }
                    rocket.isExploding = true;
                    rocket.explosionTimer = 60;
                    setTimeout(() => { gameOver(); }, 1000);
                    return;
                }
            }
             

            // Bullet-UFO collision
            let bulletsToRemove = new Set();
            let ufosToRemove = new Set();
            for (let bulletIndex = 0; bulletIndex < bullets.length; bulletIndex++) {
                const bullet = bullets[bulletIndex];
                // Normal UFOs
                for (let ufoIndex = 0; ufoIndex < ufos.length; ufoIndex++) {
                    const ufo = ufos[ufoIndex];
                    if (
                        bullet.x < ufo.x + ufo.width &&
                        bullet.x + bullet.width > ufo.x &&
                        bullet.y < ufo.y + ufo.height &&
                        bullet.y + bullet.height > ufo.y
                    ) {
                        bulletsToRemove.add(bulletIndex);
                        ufosToRemove.add(ufoIndex);
                        ufo.isExploding = true;
                        ufo.explosionTimer = 30;
                        explosionSound.currentTime = 0;
                        explosionSound.play();
                        scoreFeedbacks.push({ x: ufo.x, y: ufo.y, value: "+1", alpha: 1 });
                        hits++;
                        let daily = dailyMissions.find(m => m.id === "dailyMission");
                        if (daily && !daily.completed) {
                            daily.progress++;
                            if (daily.progress >= daily.goal) {
                                daily.completed = true;
                                coins += daily.reward;
                                scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${daily.reward} coins (Daily!)`, alpha: 1 });
                                saveProgress();
                            }
                        }
                        let mDestroyer = missions.find(m => m.id === "destroyer");
                        if (mDestroyer && !mDestroyer.completed) {
                            mDestroyer.progress++;
                            if (mDestroyer.progress >= mDestroyer.goal) {
                                mDestroyer.completed = true;
                                coins += mDestroyer.reward;
                                let coinReward = 1; // or whatever the base reward is
                                
                                coins += coinReward;
                                scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${mDestroyer.reward} coins (Mission!)`, alpha: 1 });
                                checkBigMoneyMission();
                                saveProgress();
                            }
                        }
                        let mHighRoller = missions.find(m => m.id === "highRoller");
                        if (mHighRoller && !mHighRoller.completed) {
                            mHighRoller.progress++;
                            if (mHighRoller.progress >= mHighRoller.goal) {
                                mHighRoller.completed = true;
                                coins += mHighRoller.reward;
                                let coinReward = 1; // or whatever the base reward is
                                
                                coins += coinReward;
                                scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${mHighRoller.reward} coins (Mission!)`, alpha: 1 });
                                checkBigMoneyMission();
                                saveProgress();
                            }
                        }
                        // Increase difficulty
                        hitsUntilNextDifficulty++;
                        if (hits > highscore) highscore = hits;
                        if (hitsUntilNextDifficulty >= 10) {
                            increaseDifficulty();
                            hitsUntilNextDifficulty = 0;
                        }
                        setTimeout(() => {
                            const idx = ufos.indexOf(ufo);
                            if (idx > -1) ufos.splice(idx, 1);
                        }, 500);
                        break;
                    }
                }
                // Boss UFO
                if (bossUfo && !bossUfo.isExploding &&
                    bullet.x < bossUfo.x + bossUfo.width &&
                    bullet.x + bullet.width > bossUfo.x &&
                    bullet.y < bossUfo.y + bossUfo.height &&
                    bullet.y + bullet.height > bossUfo.y
                ) {
                    bulletsToRemove.add(bulletIndex);
                    bossUfo.health--;
                    explosionSound.currentTime = 0;
                    explosionSound.play();
                    scoreFeedbacks.push({ x: bossUfo.x, y: bossUfo.y, value: "-1 HP", alpha: 1 });
                    if (bossUfo.health <= 0) {
                        bossUfo.isExploding = true;
                        bossUfo.explosionTimer = 60;
                        setTimeout(() => { bossUfo = null; bossesDefeated++; }, 1000);
                        hits += 5;
                        coins += 5; // Bonus for defeating boss
                        let coinReward = 1; // or whatever the base reward is
                        
                        coins += coinReward;
                        checkBigMoneyMission();
                        saveProgress();
                        let m = missions.find(m => m.id === "firstBoss");
                        if (m && !m.completed) {
                            m.completed = true;
                            coins += m.reward;
                            let coinReward = 1; // or whatever the base reward is
                            
                            coins += coinReward;
                            scoreFeedbacks.push({ x: bossUfo.x, y: bossUfo.y, value: `+${m.reward} coins (Mission!)`, alpha: 1 });
                            checkBigMoneyMission();
                            saveProgress();
                        }
                        if (hits > highscore) highscore = hits;
                    }
                }
            }
            bullets = bullets.filter((_, idx) => !bulletsToRemove.has(idx));
        }
    

        function gameOver() {
            if (!gameRunning) return; // Prevent multiple calls
            gameRunning = false;
            if (createufosInterval) { clearInterval(createufosInterval); createufosInterval = null; }
            if (fuelSpawnInterval) { clearInterval(fuelSpawnInterval); fuelSpawnInterval = null; }
            if (powerUpSpawnInterval) { clearInterval(powerUpSpawnInterval); powerUpSpawnInterval = null; }
            bgMusic.pause();
            bgMusic.currentTime = 0;
            shieldHitPending = false;
            showOverlay(
                `<p>Game Over!</p>
                 <form id="scoreForm" onsubmit="submitScore(event)">
                    <input type="text" id="playerName" maxlength="12" placeholder="Your name" aria-label="Your name" required>
                    <button type="submit" aria-label="Submit Score">Submit Score</button>
                 </form>`,
                `<button onclick="startNewGame()" aria-label="Restart">Restart</button>
                 <button onclick="showMenu()" aria-label="Main Menu">Main Menu</button>`
            );
        }

        function increaseDifficulty() {
            difficultyLevel++;
            if (createufosInterval) {
                clearInterval(createufosInterval);
            }
            const spawnInterval = Math.max(1000, baseSpawnInterval - (difficultyLevel - 1) * 400);
            createufosInterval = setInterval(createufos, spawnInterval);
        }

        function updateScoreDisplay() {
            ctx.fillStyle = 'white';
            ctx.font = `${20 * gameScale}px Arial`;
            let boostStatus = isBoosting ? '| BOOST ACTIVE!' : (canBoost ? '|BOOST READY!' : '| BOOST COOLDOWN');
            ctx.fillText('Hits: ' + hits + '| Highscore: ' + highscore + '| Difficulty:' + difficultyLevel  + boostStatus, 10, 30);
            ctx.fillStyle = 'gold';
            ctx.font = `${20 * gameScale}px Arial`;
            ctx.fillText('Coins: ' + coins, 10, 80);
        }

        // --- Main Game Loop ---
        function update() {
            if (!gameRunning || isPaused) return;
            let rocketSpeed = rocket.speed;
            if (isBoosting) rocketSpeed *= 2;

            if (!rocket.isExploding) {
                if (KEY_UP && rocket.y > 0) rocket.y -= rocketSpeed;
                if (KEY_DOWN && rocket.y < canvas.height - rocket.height) rocket.y += rocketSpeed;
            }
            if (wormholeActive) {
                // Going through bottom portal
                if (rocket.y > canvas.height) {
                    rocket.y = -rocket.height; // Come out from top
                }
                // Going through top portal
                if (rocket.y + rocket.height < 0) {
                    rocket.y = canvas.height; // Come out from bottom
                }
                // Allow moving beyond canvas boundaries when wormhole is active
                if (KEY_UP) rocket.y -= rocketSpeed;
                if (KEY_DOWN) rocket.y += rocketSpeed;
            } else {
                // Normal boundary checking when wormhole is not active
                if (rocket.y < 0) rocket.y = 0;
                if (rocket.y > canvas.height - rocket.height) rocket.y = canvas.height - rocket.height;
            }
            
            for (let i = asteroids.length - 1; i >= 0; i--) {
                asteroids[i].x -= asteroids[i].speed;
                if (asteroids[i].x + asteroids[i].width < 0) asteroids.splice(i, 1);
            }

            // Update score feedbacks
            for (let i = scoreFeedbacks.length - 1; i >= 0; i--) {
                scoreFeedbacks[i].alpha -= 0.02; // Adjust speed of fade
                scoreFeedbacks[i].y -= 1; // Make them float up
                if (scoreFeedbacks[i].alpha <= 0) {
                    scoreFeedbacks.splice(i, 1);
                }
            }

            createBullet();
            checkCollisions();
            if (rocket.isExploding && rocket.explosionTimer > 0) rocket.explosionTimer--;
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].x += bullets[i].speed;
                if (bullets[i].x > canvas.width) bullets.splice(i, 1);
            }
            for (let i = ufos.length - 1; i >= 0; i--) {
                const ufo = ufos[i];
                if (!ufo.isExploding) {
                    ufo.x -= ufo.speed;
                    if (ufo.x + ufo.width < 0) ufos.splice(i, 1);
                } else if (ufo.explosionTimer > 0) {
                    ufo.explosionTimer--;
                }
            }
            if (bossUfo && !bossUfo.isExploding) {
                bossUfo.x -= bossUfo.speed;
                if (bossUfo.x + bossUfo.width < 0) bossUfo = null;
            } else if (bossUfo && bossUfo.isExploding && bossUfo.explosionTimer > 0) {
                bossUfo.explosionTimer--;
            }

            if (typeof fuel !== "undefined" && gameRunning && !isPaused && !rocket.isExploding && gameStarted) {
                fuel -= 0.05; // Adjust rate as needed
                if (fuel <= 0) {
                    fuel = 0;
                    rocket.isExploding = true;
                    rocket.explosionTimer = 60;
                    setTimeout(() => { gameOver(); }, 1000);
                    return;
                }
            }

            for (let i = fuels.length - 1; i >= 0; i--) {
                let f = fuels[i];
                f.x -= f.speed;
                if (
                    !rocket.isExploding &&
                    rocket.x < f.x + f.width &&
                    rocket.x + rocket.width > f.x &&
                    rocket.y < f.y + f.height &&
                    rocket.y + rocket.height > f.y
                ) {
                    fuel = Math.min(fuel + 40, maxFuel); // Add fuel, but not above max
                    fuels.splice(i, 1);
                    let m = missions.find(m => m.id === "fuelCollector");
                    if (m && !m.completed) {
                        m.progress = (m.progress || 0) + 1;
                        if (m.progress >= m.goal) {
                            m.completed = true;
                            coins += m.reward;
                            let coinReward = 1; // or whatever the base reward is
                            
                            coins += coinReward;
                            scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${m.reward} coins (Mission!)`, alpha: 1 });
                            checkBigMoneyMission();
                            saveProgress();
                        }
                    }
                } else if (f.x + f.width < 0) {
                    fuels.splice(i, 1);
                }
            }

            for (let i = powerUps.length - 1; i >= 0; i--) {
                let p = powerUps[i];
                p.x -= p.speed;
                if (
                    !rocket.isExploding &&
                    rocket.x < p.x + p.width &&
                    rocket.x + rocket.width > p.x &&
                    rocket.y < p.y + p.height &&
                    rocket.y + rocket.height > p.y
                ) {
                    if (p.type === "shield") {
                        shieldActive = true;
                        shieldTimer = shieldDuration;
                        // Remove old shield from collectedPowerUps
                        collectedPowerUps = collectedPowerUps.filter(pu => pu.type !== "shield");
                        collectedPowerUps.push({ type: "shield", duration: shieldDuration });
                       
                    } else if (p.type === "wormhole") {
                        wormholeActive = true;
                        wormholeTimer = wormholeDuration;
                        collectedPowerUps = collectedPowerUps.filter(pu => pu.type !== "wormhole");
                        collectedPowerUps.push({ type: "wormhole", duration: wormholeDuration });
                    }
                    powerUps.splice(i, 1);
                } else if (p.x + p.width < 0) {
                    powerUps.splice(i, 1);
                }
            }

            for (let i = collectedPowerUps.length - 1; i >= 0; i--) {
                collectedPowerUps[i].duration -= 1/60;
                if (collectedPowerUps[i].duration <= 0) {
                    if (collectedPowerUps[i].type === "shield") {
                        shieldActive = false;
                        
                    }
                    if (collectedPowerUps[i].type === "wormhole") wormholeActive = false;
                    collectedPowerUps.splice(i, 1);
                }
            }


            if (gameRunning && !isPaused && !rocket.isExploding && gameStarted) {
                survivalTime += 1/60; // assuming 60fps
                let mSurvivor = missions.find(m => m.id === "survivor");
                if (mSurvivor && !mSurvivor.completed) {
                    mSurvivor.progress = Math.floor(survivalTime);
                    if (mSurvivor.progress >= mSurvivor.goal) {
                        mSurvivor.completed = true;
                        coins += mSurvivor.reward;
                        let coinReward = 1; // or whatever the base reward is
                        
                        coins += coinReward;
                        scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${mSurvivor.reward} coins (Mission!)`, alpha: 1 });
                        checkBigMoneyMission();
                        saveProgress();
                    }
                }
            }
        }

        // Helper functions
function drawBackground() {
    if (imagesLoaded && images.background.complete) {
        backgroundOffset -= backgroundScrollSpeed;
        const bgWidth = canvas.width;
        const totalWidth = bgWidth * 2;
        if (backgroundOffset <= -totalWidth) backgroundOffset += totalWidth;
        
        ctx.drawImage(images.background, backgroundOffset, 0, bgWidth, canvas.height);
        ctx.save();
        ctx.translate(backgroundOffset + bgWidth * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(images.background, 0, 0, bgWidth, canvas.height);
        ctx.restore();
        
        if (backgroundOffset < -bgWidth) {
            ctx.drawImage(images.background, backgroundOffset + totalWidth, 0, bgWidth, canvas.height);
        }
    } else {
        ctx.fillStyle = '#000022';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawRocket() {
    if (rocket.isExploding && rocket.explosionTimer > 0) {
        if (images.explosion.complete) {
            ctx.drawImage(images.explosion, rocket.x, rocket.y, rocket.width, rocket.height);
        }
    } else if (!rocket.isExploding) {
        const rocketImg = images.rockets[selectedRocket];
        if (rocketImg.complete) {
            ctx.save(); // Save context before applying effects
            
            // Only apply effects to the rocket
            if (isBoosting) {
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 20;
            }
            if (shieldActive) {
                ctx.shadowColor = "cyan";
                ctx.shadowBlur = 30;
            }
            
            ctx.drawImage(rocketImg, rocket.x, rocket.y, rocket.width, rocket.height);
            ctx.restore(); // Restore context to remove effects
        }
    }
}

function drawFuelSystem() {
    // Draw fuel items
    fuels.forEach(f => {
        if (!f) return;
        if (images.fuel.complete) {
            ctx.drawImage(images.fuel, f.x, f.y, f.width, f.height);
        } else {
            ctx.fillStyle = "lime";
            ctx.fillRect(f.x, f.y, f.width, f.height);
            ctx.fillStyle = "black";
            ctx.font = "20px Arial";
            ctx.fillText("F", f.x + 10, f.y + 28);
        }
    });

    // Draw fuel bar if fuel exists
    if (typeof fuel !== "undefined") {
        const barWidth = 200;
        const barHeight = 20;
        const barX = (canvas.width - barWidth) / 2;
        const barY = canvas.height - barHeight - 30;

        // Background
        ctx.fillStyle = "gray";
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Fuel level
        ctx.fillStyle = fuel / maxFuel < 0.3 ? "red" : "lime";
        ctx.fillRect(barX, barY, barWidth * (fuel / maxFuel), barHeight);
        
        // Border
        ctx.strokeStyle = "black";
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Text
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Fuel: ${Math.round(fuel)}/${maxFuel}`, barX + barWidth / 2, barY + barHeight - 5);
        ctx.textAlign = "left";

        // Low fuel warning
        if (fuel / maxFuel < 0.15 && images.lowFuel.complete) {
            if (Math.floor(Date.now() / 300) % 2 === 0) {
                ctx.drawImage(images.lowFuel, 
                    barX + barWidth/2 - 30, 
                    barY - 60, 
                    60, 60);
            }
        }
    }
}

function drawPowerUps() {
    // Draw floating power-ups
    powerUps.forEach(p => {
        if (!p) return;
        ctx.fillStyle = p.type === "shield" ? "cyan" : "purple";
        ctx.beginPath();
        ctx.arc(p.x + 20, p.y + 20, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = "16px Arial";
        ctx.fillStyle = "black";
        ctx.fillText(p.type === "shield" ? "S" : "W", p.x + 10, p.y + 28);
    });

    // Draw active power-ups display
    collectedPowerUps.forEach((pu, idx) => {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = pu.type === "shield" ? "cyan" : "purple";
        ctx.fillRect(20, 30 + idx * 50, 40, 40);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillText(pu.type === "shield" ? "S" : "W", 32, 58 + idx * 50);
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.fillText(`${Math.ceil(pu.duration)}s`, 40, 80 + idx * 50);
        ctx.restore();
    });

    // Draw wormhole effect
    if (wormholeActive) {
        ctx.save();
        
        // Create gradient for top portal
        let topGradient = ctx.createLinearGradient(0, 0, 0, WORMHOLE_HEIGHT);
        topGradient.addColorStop(0, 'rgba(128,0,255,0.8)');
        topGradient.addColorStop(1, 'rgba(128,0,255,0)');

        // Create gradient for bottom portal
        let bottomGradient = ctx.createLinearGradient(0, canvas.height - WORMHOLE_HEIGHT, 0, canvas.height);
        bottomGradient.addColorStop(0, 'rgba(128,0,255,0)');
        bottomGradient.addColorStop(1, 'rgba(128,0,255,0.8)');

        // Draw portals with glow effect
        ctx.shadowColor = "purple";
        ctx.shadowBlur = 20;
        
        // Top portal
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, canvas.width, WORMHOLE_HEIGHT);
        
        // Bottom portal
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, canvas.height - WORMHOLE_HEIGHT, canvas.width, WORMHOLE_HEIGHT);

        // Add some particle effects in the portals
        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            // Top portal particles
            ctx.arc(
                Math.random() * canvas.width, 
                Math.random() * WORMHOLE_HEIGHT, 
                1, 0, Math.PI * 2
            );
            // Bottom portal particles
            ctx.arc(
                Math.random() * canvas.width, 
                canvas.height - Math.random() * WORMHOLE_HEIGHT, 
                1, 0, Math.PI * 2
            );
            ctx.fill();
        }
        
        ctx.restore();
    }
}

function drawScoreFeedback() {
    scoreFeedbacks.forEach((fb, i) => {
        ctx.save();
        ctx.globalAlpha = fb.alpha;
        ctx.fillStyle = "#FFD700";
        ctx.font = "24px Arial";
        ctx.fillText(fb.value, fb.x, fb.y);
        ctx.restore();
    });
}

// Main draw function
function draw() {
    if (!canvas || !ctx) return;

    drawBackground();

    if (gameRunning && imagesLoaded) {
        // Game objects
        drawRocket();
        
        // Enemies
        asteroids.forEach(ast => {
            if (images.asteroid.complete) {
                ctx.drawImage(images.asteroid, ast.x, ast.y, ast.width, ast.height);
            }
        });

        ufos.forEach(ufo => {
            if (ufo.isExploding && ufo.explosionTimer > 0 && images.explosion.complete) {
                ctx.drawImage(images.explosion, ufo.x, ufo.y, ufo.width, ufo.height);
            } else if (!ufo.isExploding && images.ufo.complete) {
                ctx.drawImage(images.ufo, ufo.x, ufo.y, ufo.width, ufo.height);
            }
        });

        if (bossUfo) {
            if (bossUfo.isExploding && bossUfo.explosionTimer > 0 && images.explosion.complete) {
                ctx.drawImage(images.explosion, bossUfo.x, bossUfo.y, bossUfo.width, bossUfo.height);
            } else if (!bossUfo.isExploding && images.bossUfo.complete) {
                ctx.drawImage(images.bossUfo, bossUfo.x, bossUfo.y, bossUfo.width, bossUfo.height);
                ctx.fillStyle = "white";
                ctx.font = "20px Arial";
                ctx.fillText("Boss HP: " + bossUfo.health, bossUfo.x, bossUfo.y - 10);
            }
        }

        // Bullets
        bullets.forEach(bullet => {
            if (images.bullet.complete) {
                ctx.drawImage(images.bullet, bullet.x, bullet.y, bullet.width, bullet.height);
            }
        });

        // Game systems
        drawFuelSystem();
        drawPowerUps();
        drawScoreFeedback();
        updateScoreDisplay();

    } else if (!gameStarted) {
        // Title screen
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ROCKET WAR', canvas.width/2, canvas.height/2 - 50);
        ctx.font = '24px Arial';
        if (!imagesLoaded) {
            ctx.fillText('Loading images...', canvas.width/2, canvas.height/2 + 50);
        }
        ctx.textAlign = 'left';
    }
}

function initMobileControls() {
    const controls = {
        btnUp: document.getElementById('btnUp'),
        btnDown: document.getElementById('btnDown'),
        btnShoot: document.getElementById('btnShoot'),
        btnBoost: document.getElementById('btnBoost')
    };

    Object.entries(controls).forEach(([key, btn]) => {
        if (!btn) return;

        // Prevent default on all touch events
        ['touchstart', 'touchend', 'touchmove', 'touchcancel'].forEach(eventType => {
            btn.addEventListener(eventType, (e) => e.preventDefault(), { passive: false });
        });

        // Add specific touch handlers
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (key === 'btnUp') KEY_UP = true;
            if (key === 'btnDown') KEY_DOWN = true;
            if (key === 'btnShoot') KEY_SPACE = true;
            if (key === 'btnBoost') boost();
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (key === 'btnUp') KEY_UP = false;
            if (key === 'btnDown') KEY_DOWN = false;
            if (key === 'btnShoot') KEY_SPACE = false;
        }, { passive: false });
    });

    // Prevent canvas touch events
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - lastFrameTime;
    
    // Skip frame if too soon
    if (deltaTime < FRAME_TIME) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    lastFrameTime = timestamp;
    
    update(deltaTime / 1000);
    draw();
    requestAnimationFrame(gameLoop);
}


        function spawnPowerUp() {
            if (!gameRunning || isPaused || rocket.isExploding) return;
            
            const scale = isMobileDevice() ? gameScale : 1;
            powerUps.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 40),
                width: 40 * scale,
                height: 40 * scale,
                speed: 3,
                type: Math.random() < 0.5 ? 'shield' : 'wormhole'
            });
        }

        

        function spawnFuel() {
            if (!gameRunning || isPaused || rocket.isExploding) return;
            
            const scale = isMobileDevice() ? gameScale : 1;
            fuels.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 40),
                width: 40 * scale,
                height: 40 * scale,
                speed: 3
            });
        }


        function spawnAsteroid() {
            if (!gameRunning || isPaused || rocket.isExploding) return;
            
            const scale = isMobileDevice() ? gameScale : 1;
            asteroids.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 80),
                width: 80 * scale,
                height: 80 * scale,
                speed: 4 + Math.random() * 2
            });
        }

        function spawnBossUfo() {
            const scale = isMobileDevice() ? gameScale : 1;
            bossUfo = {
                x: canvas.width,
                y: Math.random() * (canvas.height - 150),
                width: 200 * scale,
                height: 120 * scale,
                speed: 1.5 + difficultyLevel * 0.1,
                health: 5 + Math.floor(difficultyLevel/2),
                isExploding: false,
                explosionTimer: 0
            };
            bossSpawnHandled = true;
        }

        function startSpawning() {
            clearAllIntervals();
            
            // UFO spawning (faster with difficulty)
            const ufoInterval = Math.max(2000, baseSpawnInterval - (difficultyLevel * 200));
            createufosInterval = setInterval(createufos, ufoInterval);
            
            // Fuel spawning (less frequent over time)
            const fuelInterval = Math.max(2000 + survivalTime/20, 1500);
            fuelSpawnInterval = setInterval(spawnFuel, fuelInterval);
            
            // Power-up spawning (every 15-20 seconds)
            powerUpSpawnInterval = setInterval(spawnPowerUp, 15000 + Math.random() * 5000);
            
            // Asteroid spawning (avoid UFO overlap)
            const asteroidInterval = Math.max(3000 - (difficultyLevel * 150), 1500);
            asteroidSpawnInterval = setInterval(spawnAsteroid, asteroidInterval);
        }

        function checkBigMoneyMission() {
            let mBigMoney = missions.find(m => m.id === "bigMoney");
            if (mBigMoney && !mBigMoney.completed) {
                mBigMoney.progress = coins;
                if (mBigMoney.progress >= mBigMoney.goal) {
                    mBigMoney.completed = true;
                    coins += mBigMoney.reward;
                    scoreFeedbacks.push({ x: rocket.x, y: rocket.y, value: `+${mBigMoney.reward} coins (Mission!)`, alpha: 1 });
                    saveProgress();
                }
            }
        }

        function saveProgress() {
            try{
            localStorage.setItem('coins', coins.toString());
            localStorage.setItem('fuelLevel', fuelLevel.toString());
            localStorage.setItem('maxFuel', maxFuel);
            localStorage.setItem('highscore', highscore);
            localStorage.setItem('shieldUpgradeLevel', shieldUpgradeLevel);
            localStorage.setItem('shieldDuration', shieldDuration);
            localStorage.setItem('wormholeUpgradeLevel', wormholeUpgradeLevel);
            localStorage.setItem('wormholeDuration', wormholeDuration);
            localStorage.setItem('dailyMissions', JSON.stringify(dailyMissions));
            // Add more as needed
            } catch (e) {
                console.error("Error saving progress:", e);
                alert("Failed to save progress. Please try again later.");
            }
        }
        function loadProgress() {
            try{
            coins = Number(localStorage.getItem('coins')) || 0;
            fuelLevel = Number(localStorage.getItem('fuelLevel')) || 1;
            maxFuel = Number(localStorage.getItem('maxFuel')) || 100;
            highscore = Number(localStorage.getItem('highscore')) || 0;
            shieldUpgradeLevel = Number(localStorage.getItem('shieldUpgradeLevel')) || 1;
            shieldDuration = Number(localStorage.getItem('shieldDuration')) || 5;
            wormholeUpgradeLevel = Number(localStorage.getItem('wormholeUpgradeLevel')) || 1;
            wormholeDuration = Number(localStorage.getItem('wormholeDuration')) || 5;
            const savedDaily = localStorage.getItem('dailyMissions');
            if (savedDaily) {
                let loaded = JSON.parse(savedDaily);
                // Merge loaded daily missions with your default ones to keep structure
                dailyMissions.forEach((m, i) => {
                    if (loaded[i]) Object.assign(m, loaded[i]);
                });
            }
            // Add more as needed
            } catch (e) {
                console.error("Error loading progress:", e);
                alert("Failed to load progress. Starting a new game.");
            }
        }

        function resetAllProgress() {
            // Clear all localStorage items
            localStorage.removeItem('coins');
            localStorage.removeItem('fuelLevel');
            localStorage.removeItem('maxFuel');
            localStorage.removeItem('highscore');
            localStorage.removeItem('shieldUpgradeLevel');
            localStorage.removeItem('shieldDuration');
            localStorage.removeItem('wormholeUpgradeLevel');
            localStorage.removeItem('wormholeDuration');
            localStorage.removeItem('dailyMissions');
            localStorage.removeItem('lastDailyReset');
            localStorage.removeItem('leaderboard');
            localStorage.removeItem('paused');

            // Reset variables to default values
            coins = 0;
            fuelLevel = 1;
            maxFuel = 100;
            highscore = 0;
            shieldUpgradeLevel = 1;
            shieldDuration = 5;
            wormholeUpgradeLevel = 1;
            wormholeDuration = 5;
            
            // Reset missions
            dailyMissions.forEach(m => { 
                m.completed = false; 
                m.progress = 0; 
            });

            // Refresh the page to apply changes
            location.reload();
        }

        function resetDailyMissionsIfNeeded() {
            const today = new Date().toDateString();
            const lastDay = localStorage.getItem('lastDailyReset');
            if (today !== lastDay) {
                dailyMissions.forEach(m => { m.completed = false; m.progress = 0; });
                localStorage.setItem('lastDailyReset', today);
            }
        }

        function showDailyMissionsMenu() {
            resetDailyMissionsIfNeeded();
            let html = '<h2>Daily Missions</h2><ul>';
            dailyMissions.forEach(mission => {
                html += `<li>${mission.name} - ${mission.progress}/${mission.goal} ${mission.completed ? '(Completed)' : ''}</li>`;
            });
            html += '</ul><button onclick="showMissionsMenu()">Back</button>';
            showOverlay(html);
        }

        function calculateGameScale() {
            if (!canvas || !isMobileDevice()) return 1;
            
            const targetWidth = 1920;
            const targetHeight = 1080;
            const scaleX = window.innerWidth / targetWidth;
            const scaleY = window.innerHeight / targetHeight;
            return Math.min(scaleX, scaleY);
        }
        
        function resizeGameObjects() {
             if (!isMobileDevice()) return; // Skip if not mobile
    
            // Apply scaling to game objects
            if (rocket) {
                rocket.width = 150 * gameScale;
                rocket.height = 65 * gameScale;
            }
            
            ufos.forEach(ufo => {
                ufo.width = 150 * gameScale;
                ufo.height = 85 * gameScale;
            });

            const scale = calculateGameScale();
            
            // Resize rocket
            rocket.width = 150 * scale;
            rocket.height = 65 * scale;
            
            // Resize UFOs
            ufos.forEach(ufo => {
                ufo.width = 150 * scale;
                ufo.height = 85 * scale;
            });
            
            // Resize bullets
            bullets.forEach(bullet => {
                bullet.width = 50 * scale;
                bullet.height = 25 * scale;
            });
            
            // Resize asteroids
            asteroids.forEach(asteroid => {
                asteroid.width = 80 * scale;
                asteroid.height = 80 * scale;
            });
            
            // Resize power-ups and fuel
            powerUps.forEach(powerUp => {
                powerUp.width = 40 * scale;
                powerUp.height = 40 * scale;
            });
            
            fuels.forEach(fuel => {
                fuel.width = 40 * scale;
                fuel.height = 40 * scale;
            });
            
            // Resize boss UFO if present
            if (bossUfo) {
                bossUfo.width = 200 * scale;
                bossUfo.height = 120 * scale;
            }
        } 
        
        function resizeCanvas() {
            if (!canvas) return;
            
            // Set canvas dimensions
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Only apply scaling on mobile
            if (isMobileDevice()) {
                gameScale = calculateGameScale();
                resizeGameObjects();
            } else {
                gameScale = 1; // Reset to default scale on desktop
            }
            
            // Update font size
            ctx.font = `${20 * (isMobileDevice() ? gameScale : 1)}px Arial`;
        }

        function initGame() {
            // Initialize game state
            gameRunning = false;
            gameStarted = false;
            isPaused = false;
            hits = 0;
            difficultyLevel = 1;
            survivalTime = 0;
            fuel = maxFuel;
    
            // Clear all arrays
            ufos = [];
            bullets = [];
            asteroids = [];
            powerUps = [];
            fuels = [];
            scoreFeedbacks = [];
            collectedPowerUps = [];
            
            // Reset boss state
            bossUfo = null;
            bossSpawnHandled = false;
            
            // Reset power-up states
            shieldActive = false;
            wormholeActive = false;
            shieldTimer = 0;
            wormholeTimer = 0;
            
            // Reset rocket position and state
            rocket = {
                x: 50,
                y: canvas.height / 2 - 32.5,
                width: 150 * gameScale,
                height: 65 * gameScale,
                isExploding: false,
                explosionTimer: 0
            };
    
            // Clear any existing intervals
            clearAllIntervals();
            
            // Load saved progress
            loadProgress();
            
            // Reset audio states
            bgMusic.currentTime = 0;
            bgMusic.volume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;
            shootSound.volume = parseFloat(localStorage.getItem('effectsVolume')) || 0.5;
            explosionSound.volume = parseFloat(localStorage.getItem('effectsVolume')) || 0.5;
            
            // Show the initial menu once images are loaded
            if (imagesLoaded) {
                showNewGameMenu();
            }
        }

        window.onload = function() {
            // Initialize canvas and context
            canvas = document.getElementById('canvas');
            ctx = canvas.getContext('2d');
            
            // Show loading screen
            showOverlay(
                '<h2>Loading Game...</h2><p>Please wait...</p>',
                ''
            );

            // Initialize game scale
            gameScale = calculateGameScale();
            window.gameScale = gameScale;

            // Set up event listeners
            window.addEventListener('resize', resizeCanvas);
            window.addEventListener('orientationchange', resizeCanvas);
            
            // Mobile setup
            if (window.screen.orientation) {
                window.screen.orientation.lock('landscape').catch(err => {
                    console.warn('Orientation lock failed:', err);
                });
            }

            // Prevent unwanted touch behaviors
            window.addEventListener('touchstart', function(e) {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                    e.preventDefault();
                }
            }, {passive: false});

            // Initialize mobile controls
            initMobileControls();
            
            // Initialize game components
            resizeCanvas();
            resetDailyMissionsIfNeeded();
            loadImages();
            gameLoop();
            initGame();

            // Expose functions to global scope
            window.startNewGame = startNewGame;
            window.showMenu = showMenu;
            window.showChooseRocketMenu = showChooseRocketMenu;
            window.changeRocket = changeRocket;
            window.hideOverlay = hideOverlay;
            window.toggleFullScreen = toggleFullScreen;
            window.togglePause = togglePause;
            window.toggleMute = toggleMute;
            window.showLeaderboard = showLeaderboard;
            window.submitScore = submitScore;
            window.nextRocketPage = nextRocketPage;
            window.prevRocketPage = prevRocketPage;
            window.fuels = window.fuels || [];
            window.startSpawning = startSpawning;
            window.showMissionsMenu = showMissionsMenu;
            window.showOverlay = showOverlay;
            window.hideOverlay = hideOverlay;
            window.showDailyMissionsMenu = showDailyMissionsMenu;
            window.showSoundMenu = showSoundMenu;
            window.setMusicVolume = setMusicVolume;
            window.setEffectsVolume = setEffectsVolume;
            window.resetAllProgress = resetAllProgress;
            window.saveProgress = saveProgress;

            // Expose game state variables
            window.collectedPowerUps = collectedPowerUps;
            window.fuelLevel = fuelLevel;
            window.maxFuel = maxFuel;
            window.fuel = fuel;
            window.coins = coins;
            window.shieldUpgradeLevel = shieldUpgradeLevel;
            window.shieldDuration = shieldDuration;
            window.wormholeUpgradeLevel = wormholeUpgradeLevel;
            window.wormholeDuration = wormholeDuration;
            window.fuelUpgradeCost = fuelUpgradeCost;
            window.shieldUpgradeCost = shieldUpgradeCost;
            window.wormholeUpgradeCost = wormholeUpgradeCost;
            window.gameScale = gameScale;
        };
    })();