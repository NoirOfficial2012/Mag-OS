// =========================
// 1) BOOT / SYSTEM STATUS
// =========================
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FALLBACK_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23333"/%3E%3Ctext x="24" y="32" text-anchor="middle" fill="%23fff" font-size="24"%3E📱%3C/text%3E%3C/svg%3E';

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value;
}

function getFallbackIcon() {
    return FALLBACK_ICON;
}

function ensureUrlProtocol(url) {
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

let bootWeatherReady = false;
let bootFinishScheduled = false;
const bootStartedAt = Date.now();
const bootFallbackTimer = window.setTimeout(() => {
    bootWeatherReady = true;
    const status = document.getElementById('bootStatus');
    if (status) status.textContent = 'Starting offline';
    finishBoot();
}, 8000);

function finishBoot() {
    if (!bootWeatherReady || bootFinishScheduled) return;
    bootFinishScheduled = true;
    window.clearTimeout(bootFallbackTimer);
    const minimumBootTime = 3000;
    const remainingTime = Math.max(0, minimumBootTime - (Date.now() - bootStartedAt));
    window.setTimeout(() => {
        const bootScreen = document.getElementById('bootScreen');
        if (!bootScreen) return;
        bootScreen.classList.add('ready');
        window.setTimeout(() => bootScreen.classList.add('done'), 400);
    }, remainingTime);
}

function updateBattery() {
    try {
        if ('getBattery' in navigator) {
            navigator.getBattery()
                .then(function(battery) {
                    const level = Math.round(battery.level * 100);
                    setText('batteryLevel', `${level}%`);
                    setText('batteryIcon', battery.charging ? '' : '🔋');
                })
                .catch(function() {
                    setText('batteryLevel', '85%');
                    setText('batteryIcon', '');
                });
        } else {
            setText('batteryLevel', '92%');
            setText('batteryIcon', '');
        }
    } catch (error) {
        setText('batteryLevel', '88%');
        setText('batteryIcon', '');
    }
}

updateBattery();
setInterval(updateBattery, 30000);

function updateNetwork() {
    const wifi = getElement('wifiDisplay');
    if (!wifi) return;

    if (navigator.onLine) {
        wifi.textContent = 'Online';
        wifi.style.opacity = '0.7';
    } else {
        wifi.textContent = 'Offline';
        wifi.style.opacity = '0.2';
    }
}
updateNetwork();
window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('active');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('#notificationPanel') && !e.target.closest('.td-item')) {
        document.getElementById('notificationPanel').classList.remove('active');
    }
});

// =========================
// 2) CALENDAR
// =========================
let calendarDate = new Date();
let selectedDate = new Date();

function renderCalendar() {
    const grid = getElement('calendarGrid');
    const monthYear = getElement('calMonthYear');
    if (!grid || !monthYear) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    monthYear.textContent = `${MONTH_NAMES[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSelected = (day) => day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

    let html = '';
    DAY_NAMES.forEach(name => {
        html += `<div class="day-name">${name}</div>`;
    });

    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="day other-month">${daysInPrevMonth - i}</div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        let className = 'day';
        if (isToday(day)) className += ' today';
        if (isSelected(day)) className += ' selected';
        html += `<div class="${className}" onclick="selectDate(${day})">${day}</div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="day other-month">${day}</div>`;
    }

    grid.innerHTML = html;
}

function changeMonth(delta) {
    calendarDate.setMonth(calendarDate.getMonth() + delta);
    renderCalendar();
}

function selectDate(day) {
    selectedDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    renderCalendar();
}

renderCalendar();

function updateTopDock() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('topTime').textContent = time;
    document.getElementById('topDate').textContent = date;
}
setInterval(updateTopDock, 1000);
updateTopDock();

let customApps = JSON.parse(localStorage.getItem('customApps') || '[]');
let pinnedApps = JSON.parse(localStorage.getItem('pinnedApps') || '[]');
let appIdCounter = parseInt(localStorage.getItem('appIdCounter') || '0');

function saveCustomApps() {
    localStorage.setItem('customApps', JSON.stringify(customApps));
    localStorage.setItem('appIdCounter', appIdCounter.toString());
    localStorage.setItem('pinnedApps', JSON.stringify(pinnedApps));
    renderCustomApps();
    renderCustomAppsMenu();
    renderPinnedApps();
}

document.addEventListener('DOMContentLoaded', function() {
    const iconInput = document.getElementById('newAppIcon');
    if (iconInput) iconInput.addEventListener('input', function() {
        const url = this.value.trim();
        const container = document.getElementById('iconPreviewContainer');
        const preview = document.getElementById('iconPreview');
        const previewUrl = document.getElementById('iconPreviewUrl');
        if (url) { container.style.display = 'flex'; preview.src = url; previewUrl.textContent = url; preview.onerror =
                function() { this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23333"/%3E%3Ctext x="24" y="32" text-anchor="middle" fill="%23fff" font-size="24"%3E📱%3C/text%3E%3C/svg%3E'; }; } else container.style
            .display = 'none';
    });
    ['newAppName', 'newAppUrl', 'newAppIcon'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keypress', function(e) { if (e.key === 'Enter') { const btn = document
                    .querySelector('.add-app-form button:last-child'); if (btn) btn.click(); } });
    });
});

// =========================
// 3) CUSTOM APPS
// =========================
function addCustomApp() {
    const nameInput = getElement('newAppName');
    const urlInput = getElement('newAppUrl');
    const iconInput = getElement('newAppIcon');

    if (!nameInput || !urlInput || !iconInput) return;

    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    let icon = iconInput.value.trim();

    if (!name || !url) {
        alert('Please enter both name and URL!');
        return;
    }

    url = ensureUrlProtocol(url);

    if (customApps.some(app => app.url === url)) {
        alert('App already exists!');
        return;
    }

    if (!icon) {
        try {
            const urlObject = new URL(url);
            icon = `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=128`;
        } catch (error) {
            icon = getFallbackIcon();
        }
    }

    const id = ++appIdCounter;
    customApps.push({ id, name, url, icon });
    saveCustomApps();

    nameInput.value = '';
    urlInput.value = '';
    iconInput.value = '';

    const previewContainer = getElement('iconPreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';

    const btn = document.querySelector('.add-app-form button:last-child');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Added!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 1500);
    }
}

function removeCustomApp(id) { 
    if (confirm('Remove this app?')) { 
        customApps = customApps.filter(app => app.id !== id);
        pinnedApps = pinnedApps.filter(p => p !== id);
        saveCustomApps(); 
    } 
}

function clearAllCustomApps() { 
    if (customApps.length === 0) return; 
    if (confirm('Remove all custom apps?')) { 
        customApps = [];
        pinnedApps = [];
        saveCustomApps(); 
    } 
}

function openCustomApp(id) { 
    const app = customApps.find(a => a.id === id); 
    if (app) window.open(app.url, '_blank'); 
}

function togglePinApp(id, event) {
    if (event) event.stopPropagation();
    const index = pinnedApps.indexOf(id);
    if (index > -1) { pinnedApps.splice(index, 1); } else { pinnedApps.push(id); }
    saveCustomApps();
}

function isAppPinned(id) { return pinnedApps.includes(id); }

function renderCustomApps() {
    const container = getElement('customAppsList');
    if (!container) return;

    if (customApps.length === 0) {
        container.innerHTML = '<div style="opacity:0.3;text-align:center;padding:20px;font-size:13px;">No custom apps added yet. Add one above!</div>';
        return;
    }

    container.innerHTML = customApps.map(app => `
        <div class="app-list-item">
            <div class="app-name">
                <img src="${app.icon || getFallbackIcon()}" onerror="this.src='${getFallbackIcon()}'" />
                <div class="app-name-text">
                    <span>${app.name}</span>
                    <span class="app-url">${app.url.replace(/^https?:\/\//, '')}</span>
                </div>
            </div>
            <div style="display:flex;gap:4px;">
                <button onclick="togglePinApp(${app.id}, event)" style="background:${isAppPinned(app.id) ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isAppPinned(app.id) ? '#2ecc71' : 'rgba(255,255,255,0.1)'};padding:2px 8px;font-size:10px;">
                    ${isAppPinned(app.id) ? 'Pinned' : 'Pin'}
                </button>
                <button class="remove-app-btn" onclick="removeCustomApp(${app.id})">Remove</button>
            </div>
        </div>
    `).join('');
}

function renderCustomAppsMenu() {
    const container = getElement('customAppsMenuContainer');
    if (!container) return;

    if (customApps.length === 0) {
        container.innerHTML = '<div style="opacity:0.3;font-size:12px;padding:6px 14px;">No custom apps yet</div>';
        return;
    }

    container.innerHTML = customApps.map(app => `
        <div class="menu-item" onclick="openCustomApp(${app.id})">
            <img src="${app.icon || getFallbackIcon()}" onerror="this.src='${getFallbackIcon()}'" class="menu-icon" />
            ${app.name}
            <span class="pin-btn ${isAppPinned(app.id) ? 'pinned' : ''}" onclick="togglePinApp(${app.id}, event)">${isAppPinned(app.id) ? 'Unpin' : 'Pin'}</span>
        </div>
    `).join('');
}

function renderPinnedApps() {
    const container = getElement('pinnedAppsContainer');
    if (!container) return;

    container.innerHTML = '';
    const pinnedCustomApps = customApps.filter(app => pinnedApps.includes(app.id));

    pinnedCustomApps.forEach(app => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon';
        iconDiv.innerHTML = `
            <img src="${app.icon || getFallbackIcon()}" onerror="this.src='${getFallbackIcon()}'" title="${app.name}" />
            <span class="unpin-btn" onclick="togglePinApp(${app.id}, event)" title="Unpin">✕</span>
        `;
        iconDiv.onclick = function(event) {
            if (event.target.classList.contains('unpin-btn')) return;
            openCustomApp(app.id);
        };
        container.appendChild(iconDiv);
    });
}

function exportCustomApps() {
    if (customApps.length === 0) { alert('No custom apps to export.'); return; }
    const data = JSON.stringify({ apps: customApps, pinned: pinnedApps }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_apps_backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importCustomApps(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported.apps || !Array.isArray(imported.apps)) throw new Error('Invalid format');
            if (customApps.length > 0 && !confirm('This will replace all your current custom apps. Continue?')) return;
            customApps = imported.apps.filter(app => app.id && app.name && app.url);
            pinnedApps = imported.pinned || [];
            const maxId = customApps.reduce((max, app) => Math.max(max, app.id || 0), 0);
            appIdCounter = Math.max(appIdCounter, maxId);
            saveCustomApps();
            alert(`Imported ${customApps.length} custom apps with ${pinnedApps.length} pinned!`);
        } catch (err) { alert('Failed to import: ' + err.message); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

renderCustomApps();
renderCustomAppsMenu();
renderPinnedApps();

const terminal = {
    body: getElement('terminalBody'),
    input: getElement('termInput'),
    history: [],
    historyIndex: -1
};

function terminalPrint(text) {
    if (!terminal.body) return;
    const div = document.createElement('div');
    div.className = 'term-output';
    div.innerHTML = text;
    terminal.body.insertBefore(div, terminal.body.lastElementChild);
    terminal.body.scrollTop = terminal.body.scrollHeight;
}

function clearTerminal() {
    if (!terminal.body) return;
    terminal.body.querySelectorAll('.term-output').forEach(element => element.remove());
    terminalPrint('<span class="info">Terminal cleared.</span>');
}

function processCommand(commandText) {
    const trimmed = commandText.trim();
    if (!trimmed) return;

    terminal.history.push(trimmed);
    terminal.historyIndex = terminal.history.length;

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const argStr = args.join(' ');

    terminalPrint(`<span class="prompt">➜</span> <span class="cmd-text">${trimmed}</span>`);

    switch (command) {
        case 'help':
            terminalPrint(`
                <span class="highlight">╔══════════════════════════════════╗</span><br>
                <span class="highlight">║  MAGOS TERMINAL COMMANDS       ║</span><br>
                <span class="highlight">╠══════════════════════════════════╣</span><br>
                <span class="info">  help</span> - Show this help<br>
                <span class="info">  echo</span> - Print text<br>
                <span class="info">  clear</span> - Clear terminal<br>
                <span class="info">  date</span> - Show date/time<br>
                <span class="info">  whoami</span> - Show user<br>
                <span class="info">  ls</span> - List apps<br>
                <span class="info">  open</span> - Open app<br>
                <span class="info">  focus</span> - Toggle focus<br>
                <span class="info">  weather</span> - Show weather<br>
                <span class="info">  uptime</span> - System uptime<br>
                <span class="info">  history</span> - Command history<br>
                <span class="info">  quote</span> - Random quote<br>
                <span class="info">  calc</span> - Calculate<br>
                <span class="highlight">╚══════════════════════════════════╝</span>
            `);
            break;
        case 'echo':
            terminalPrint(`<span class="success">${argStr}</span>`);
            break;
        case 'clear':
            clearTerminal();
            break;
        case 'date':
            terminalPrint(`<span class="info">${new Date().toString()}</span>`);
            break;
        case 'whoami':
            terminalPrint('<span class="success">magos-user</span>');
            break;
        case 'ls': {
            const apps = ['timer', 'tasks', 'notes', 'calc', 'stats', 'settings', 'songbox', 'terminal', 'weather', 'calendar'];
            terminalPrint(`<span class="info">Apps: ${apps.join(', ')}</span>`);
            if (customApps.length) {
                terminalPrint(`<span class="info">Custom: ${customApps.map(app => app.name).join(', ')}</span>`);
            }
            break;
        }
        case 'open': {
            const appName = args[0];
            if (!appName) {
                terminalPrint('<span class="error">Usage: open &lt;app&gt;</span>');
                break;
            }

            const appMap = {
                timer: 'timer',
                tasks: 'tasks',
                notes: 'notes',
                calc: 'calc',
                stats: 'stats',
                settings: 'settings',
                songbox: 'songboxWindow',
                terminal: 'terminalWindow',
                weather: 'weatherDetails',
                calendar: 'calendarWindow'
            };

            if (appMap[appName]) {
                openApp(appMap[appName]);
                terminalPrint(`<span class="success">Opening ${appName}...</span>`);
                break;
            }

            const custom = customApps.find(app => app.name.toLowerCase() === appName.toLowerCase());
            if (custom) {
                openCustomApp(custom.id);
                terminalPrint(`<span class="success">Opening ${custom.name}...</span>`);
                break;
            }

            terminalPrint(`<span class="error">App "${appName}" not found.</span>`);
            break;
        }
        case 'focus':
            toggleDeepFocus();
            terminalPrint(`<span class="success">Focus ${document.body.classList.contains('deep-focus') ? 'ON' : 'OFF'}</span>`);
            break;
        case 'weather':
            fetchWeather();
            terminalPrint('<span class="info">Weather updated.</span>');
            break;
        case 'uptime': {
            const totalSeconds = Math.floor((Date.now() - performance.now()) / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            terminalPrint(`<span class="info">Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s</span>`);
            break;
        }
        case 'history': {
            if (!terminal.history.length) {
                terminalPrint('<span class="info">No commands.</span>');
                break;
            }
            terminalPrint(`<span class="info">History (${terminal.history.length}):</span>`);
            terminal.history.forEach((entry, index) => terminalPrint(`  ${String(index + 1).padStart(3)}  ${entry}`));
            break;
        }
        case 'quote': {
            const quotes = [
                '"Stay hungry, stay foolish." - Steve Jobs',
                '"Simplicity is the ultimate sophistication." - Da Vinci',
                '"Make it work, make it right, make it fast." - Kent Beck',
                '"The only way to do great work is to love what you do." - Steve Jobs'
            ];
            terminalPrint(`<span class="info">${quotes[Math.floor(Math.random() * quotes.length)]}</span>`);
            break;
        }
        case 'calc': {
            if (!argStr) {
                terminalPrint('<span class="error">Usage: calc &lt;expression&gt;</span>');
                break;
            }
            try {
                const result = Function('"use strict";return (' + argStr + ')')();
                terminalPrint(`<span class="success">= ${result}</span>`);
            } catch (error) {
                terminalPrint('<span class="error">Invalid expression</span>');
            }
            break;
        }
        default:
            terminalPrint(`<span class="error">Unknown: ${command}. Type "help".</span>`);
    }
}

if (terminal.input) {
    terminal.input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const commandText = this.value;
            processCommand(commandText);
            this.value = '';
            setTimeout(() => {
                if (terminal.body) terminal.body.scrollTop = terminal.body.scrollHeight;
                this.focus();
            }, 50);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (terminal.historyIndex > 0) {
                terminal.historyIndex -= 1;
                this.value = terminal.history[terminal.historyIndex] || '';
            }
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (terminal.historyIndex < terminal.history.length - 1) {
                terminal.historyIndex += 1;
                this.value = terminal.history[terminal.historyIndex] || '';
            } else {
                terminal.historyIndex = terminal.history.length;
                this.value = '';
            }
        }
    });
}

const effectsCanvas = document.getElementById('effectsCanvas');
const ectx = effectsCanvas ? effectsCanvas.getContext('2d') : null;
let effectType = 'none';
let effectParticles = [];
let effectAnimId = null;

function resizeEffects() {
    if (!effectsCanvas) return;
    effectsCanvas.width = window.innerWidth;
    effectsCanvas.height = window.innerHeight;
}

resizeEffects();
window.addEventListener('resize', resizeEffects);

function setEffect(type) {
    effectType = type;
    if (effectAnimId) cancelAnimationFrame(effectAnimId);
    effectParticles = [];

    document.querySelectorAll('.effect-btn').forEach(button => button.classList.remove('active'));
    const buttonId = 'eff' + type.charAt(0).toUpperCase() + type.slice(1);
    const button = document.getElementById(buttonId);
    if (button) button.classList.add('active');

    localStorage.setItem('effectType', type);

    if (!effectsCanvas || !ectx) return;
    ectx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);

    if (type === 'none') return;

    const width = effectsCanvas.width;
    const height = effectsCanvas.height;

    if (type === 'stars') {
        for (let index = 0; index < 100; index += 1) {
            effectParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.005,
                opacity: Math.random() * 0.5 + 0.3
            });
        }
    } else if (type === 'rain') {
        for (let index = 0; index < 150; index += 1) {
            effectParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                length: Math.random() * 15 + 8,
                speed: Math.random() * 8 + 6,
                opacity: Math.random() * 0.2 + 0.1,
                thickness: Math.random() * 0.5 + 0.3
            });
        }
    } else if (type === 'snow') {
        for (let index = 0; index < 80; index += 1) {
            effectParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 3 + 1.5,
                speed: Math.random() * 0.5 + 0.2,
                wind: Math.random() * 0.3 - 0.15,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.01 + 0.005,
                opacity: Math.random() * 0.4 + 0.4
            });
        }
    }

    animateEffect();
}

function animateEffect() {
    if (effectType === 'none' || !effectsCanvas || !ectx) return;

    const width = effectsCanvas.width;
    const height = effectsCanvas.height;
    ectx.clearRect(0, 0, width, height);

    if (effectType === 'stars') {
        effectParticles.forEach(particle => {
            particle.twinkle += particle.speed;
            const alpha = particle.opacity * (0.4 + Math.sin(particle.twinkle) * 0.6);
            ectx.fillStyle = `rgba(255,255,255,${alpha})`;
            ectx.beginPath();
            ectx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ectx.fill();
        });
    } else if (effectType === 'rain') {
        ectx.strokeStyle = 'rgba(180,200,220,0.3)';
        effectParticles.forEach(particle => {
            ectx.lineWidth = particle.thickness;
            ectx.beginPath();
            ectx.moveTo(particle.x, particle.y);
            ectx.lineTo(particle.x + 1, particle.y + particle.length);
            ectx.stroke();
            particle.y += particle.speed;
            if (particle.y > height) {
                particle.y = -particle.length;
                particle.x = Math.random() * width;
            }
        });
    } else if (effectType === 'snow') {
        effectParticles.forEach(particle => {
            ectx.fillStyle = `rgba(255,255,255,${particle.opacity})`;
            ectx.beginPath();
            ectx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ectx.fill();
            particle.y += particle.speed;
            particle.x += particle.wind + Math.sin(particle.wobble) * 0.3;
            particle.wobble += particle.wobbleSpeed;
            if (particle.y > height + particle.size) {
                particle.y = -particle.size;
                particle.x = Math.random() * width;
            }
            if (particle.x > width + particle.size) particle.x = -particle.size;
            if (particle.x < -particle.size) particle.x = width + particle.size;
        });
    }

    effectAnimId = requestAnimationFrame(animateEffect);
}

const wallpaper = {
    container: getElement('liveWallpaperContainer'),
    status: getElement('wallpaperStatus'),
    requestCounter: 0,
    retryCount: 0,
    active: false,

    setStatus(message, state = 'loading') {
        if (!this.status) return;
        this.status.className = `wallpaper-status active ${state}`;
        this.status.textContent = message;
    },

    syncPreviewSelection(source) {
        document.querySelectorAll('.live-wallpaper-preview').forEach(preview => {
            preview.classList.toggle('selected', preview.dataset.wallpaperSource === source);
        });
    },

    clearSelection() {
        document.querySelectorAll('.live-wallpaper-preview').forEach(preview => preview.classList.remove('selected'));
        document.querySelectorAll('.wallpaper-preview').forEach(preview => preview.classList.remove('selected'));
    },

    setLive(source, name) {
        if (!this.container) return;
        const requestId = ++this.requestCounter;
        const previousBackground = document.body.style.background;
        const previousVideo = this.container.querySelector('video');

        if (previousVideo) {
            previousVideo.pause();
            previousVideo.removeAttribute('src');
            previousVideo.load();
        }

        this.container.innerHTML = '<div class="overlay"></div>';
        this.retryCount = 0;
        this.setStatus(`Loading ${name}...`, 'loading');
        this.syncPreviewSelection(source);

        try {
            const video = document.createElement('video');
            video.src = source;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('preload', 'auto');
            video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';

            video.onerror = () => {
                if (requestId !== this.requestCounter) return;
                this.container.classList.remove('active');
                this.active = false;
                document.body.style.background = previousBackground || '#111';
                this.clearSelection();
                this.setStatus(`Could not decode ${name}. Re-export it as H.264 MP4.`, 'error');
            };

            video.onloadeddata = () => this.attemptPlay(video, name, requestId);
            this.container.appendChild(video);
            setTimeout(() => {
                if (requestId === this.requestCounter) {
                    video.muted = true;
                    this.attemptPlay(video, name, requestId);
                }
            }, 100);
            this.container.classList.add('active');
            document.body.style.background = 'transparent';
            this.active = true;
            localStorage.setItem('liveWallpaper', JSON.stringify({ source, name }));
        } catch (error) {
            this.setStatus(`Error loading ${name}`, 'error');
        }
    },

    attemptPlay(video, name, requestId) {
        if (requestId !== this.requestCounter || video !== this.container.querySelector('video')) return;

        video.muted = true;
        video.play().then(() => {
            if (requestId !== this.requestCounter) return;
            this.setStatus(`${name} active`, 'success');
        }).catch(() => {
            if (requestId !== this.requestCounter) return;
            this.retryCount += 1;
            if (this.retryCount <= 3) {
                setTimeout(() => this.attemptPlay(video, name, requestId), 1000);
            } else {
                this.setStatus('Click anywhere to start', 'error');
            }
        });
    },

    stop() {
        if (!this.container) return;
        this.requestCounter += 1;
        const video = this.container.querySelector('video');
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        this.container.innerHTML = '<div class="overlay"></div>';
        this.container.classList.remove('active');
        this.active = false;
        document.body.style.background = '';
        localStorage.removeItem('liveWallpaper');
        this.clearSelection();
        this.setStatus('Stopped', 'success');
    },

    setStatic(url) {
        this.stop();
        if (url === 'black') {
            document.body.style.background = '#000';
        } else {
            document.body.style.background = `url('${url}') center/cover fixed`;
        }
        localStorage.setItem('wallpaper', url);
    }
};

let liveActive = false;
let retryCount = 0;
let liveWallpaperRequest = 0;

function setLiveWallpaper(source, name) {
    wallpaper.setLive(source, name);
    liveActive = wallpaper.active;
}

function attemptPlay(video, status, name, requestId) {
    wallpaper.attemptPlay(video, name, requestId);
}

function setCustomLiveWallpaper() {
    const url = document.getElementById('liveWallpaperUrl').value.trim();
    if (!url) return;
    setLiveWallpaper(url, 'Custom Video');
}

document.querySelectorAll('.live-wallpaper-preview').forEach(preview => {
    const previewVideo = preview.querySelector('video');
    if (!previewVideo) return;
    preview.addEventListener('mouseenter', () => previewVideo.play().catch(() => {}));
    preview.addEventListener('mouseleave', () => {
        previewVideo.pause();
        previewVideo.currentTime = 0;
    });
});

function stopLiveWallpaper() {
    wallpaper.stop();
    liveActive = false;
    liveWallpaperRequest = wallpaper.requestCounter;
}

function setWallpaper(url) {
    wallpaper.setStatic(url);
    liveActive = false;
    localStorage.setItem('wallpaper', url);
}

const API_KEY = '03f52c35c448b2ea91bd3699caa15283';
let userLocation = null;

function getLocation() {
    if (!navigator.geolocation) {
        userLocation = { lat: 16.7050, lon: 74.2433, name: 'Kolhapur, IN' };
        fetchWeather();
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        userLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
        try {
            const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${userLocation.lat}&lon=${userLocation.lon}&limit=1&appid=${API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (data[0]) userLocation.name = `${data[0].name}, ${data[0].country}`;
            }
        } catch (error) {
            console.log('Location lookup failed', error);
        }
        fetchWeather();
    }, () => {
        userLocation = { lat: 16.7050, lon: 74.2433, name: 'Kolhapur, IN' };
        fetchWeather();
    }, { enableHighAccuracy: true, timeout: 10000 });
}

async function fetchWeather() {
    if (!userLocation) return;
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${API_KEY}&units=metric`);
        if (!response.ok) return;
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        console.log('Weather fetch failed', error);
    }
}

function updateWeatherUI(data) {
    const temperature = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const condition = data.weather[0].description;
    const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const locationName = userLocation?.name || data.name;

    setText('taskbarTemp', `${temperature}°`);
    setText('taskbarCondition', condition);
    getElement('taskbarWeatherIcon').src = icon;
    setText('lockTemp', `${temperature}°`);
    setText('lockCondition', condition);
    setText('lockLocation', locationName);
    getElement('lockWeatherIcon').src = icon;
    setText('detailTemp', `${temperature}°`);
    setText('detailCondition', condition.charAt(0).toUpperCase() + condition.slice(1));
    setText('detailLocation', locationName);
    getElement('detailWeatherIcon').src = icon;
    setText('detailFeelsLike', `${feelsLike}°`);
    setText('detailHumidity', `${data.main.humidity}%`);
    setText('detailWind', `${Math.round(data.wind.speed * 3.6)} km/h`);
    setText('detailPressure', `${data.main.pressure} hPa`);

    bootWeatherReady = true;
    const bootStatus = getElement('bootStatus');
    if (bootStatus) bootStatus.textContent = 'Weather ready';
    finishBoot();
}

function forceLocationUpdate() { getLocation(); }
function setManualLocation() {
    const city = getElement('manualLocationInput').value.trim();
    if (!city) return;
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data[0]) {
                userLocation = { lat: data[0].lat, lon: data[0].lon, name: `${data[0].name}, ${data[0].country}` };
                fetchWeather();
                closeApp('settings');
            }
        });
}
function resetLocation() { getLocation(); closeApp('settings'); }
function refreshWeather() { fetchWeather(); }
getLocation();
setInterval(getLocation, 300000);

let highestZ = 10;
const lockScreen = document.getElementById('lockScreen');
const timeDisplay = document.getElementById('timeDisplay');
lockScreen.onclick = () => { lockScreen.classList.add('hidden');
    setTimeout(() => lockScreen.style.display = 'none', 600); };

function updateClock() { const d = new Date();
    timeDisplay.innerText = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'); }
setInterval(updateClock, 1000);
updateClock();

function toggleStartMenu(e) {
    if (e) e.stopPropagation();
    const startMenu = document.getElementById('startMenu');
    if (startMenu) startMenu.classList.toggle('active');
}

document.addEventListener('click', () => {
    const startMenu = document.getElementById('startMenu');
    if (startMenu) startMenu.classList.remove('active');
});

function handleLauncherClick(event) {
    const target = event.target.closest('[data-app-id], [data-action], [data-external-url]');
    if (!target) return;

    if (target.dataset.appId) {
        event.preventDefault();
        event.stopPropagation();
        if (target.dataset.appId === 'customAppsManager') {
            openApp('customAppsManager');
        } else {
            openApp(target.dataset.appId);
        }
        return;
    }

    if (target.dataset.externalUrl) {
        event.preventDefault();
        event.stopPropagation();
        openExternal(target.dataset.externalUrl);
        return;
    }

    if (target.dataset.action === 'toggle-start-menu') {
        event.preventDefault();
        event.stopPropagation();
        toggleStartMenu(event);
        return;
    }

    if (target.dataset.action === 'toggle-fullscreen') {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen();
        return;
    }

    if (target.dataset.action === 'toggle-deep-focus') {
        event.preventDefault();
        event.stopPropagation();
        toggleDeepFocus();
        return;
    }

    if (target.dataset.action === 'open-theme-store') {
        event.preventDefault();
        event.stopPropagation();
        createThemeStore();
    }
}

document.addEventListener('click', handleLauncherClick);

let openWindows = new Set(),
    activeWindow = null;

function openApp(id) { const w = document.getElementById(id); if (!w) return;
    w.classList.add('active');
    openWindows.add(id);
    bringToFront(w);
    if (id === 'paintWindow') requestAnimationFrame(resizePaintCanvas);
    activeWindow = id;
    if (id === 'paintWindow') requestAnimationFrame(resizePaintCanvas); }

function closeApp(id) { const w = document.getElementById(id); if (w) w.classList.remove('active');
    openWindows.delete(id); if (activeWindow === id) { activeWindow = [...openWindows].pop() || null; if (activeWindow) bringToFront(document.getElementById(activeWindow)); } }

function minimizeApp(id) { closeApp(id); }

function maximizeApp(id) {
    const w = document.getElementById(id);
    if (!w) return;
    if (w.classList.contains('maximized')) {
        w.classList.remove('maximized');
        const saved = localStorage.getItem('window_' + id);
        if (saved) { const pos = JSON.parse(saved); w.style.width = pos.width || '400px'; w.style.height = pos.height || '300px'; w.style.top = pos.top || '100px'; w.style.left = pos.left || '100px'; } else { w.style.width = w.dataset.ow || '400px'; w.style.height = w.dataset.oh || '300px'; w.style.top = w.dataset.ot || '100px'; w.style.left = w.dataset.ol || '100px'; }
    } else { w.dataset.ow = w.style.width || w.offsetWidth + 'px'; w.dataset.oh = w.style.height || w.offsetHeight + 'px'; w.dataset.ot = w.style.top || w.offsetTop + 'px'; w.dataset.ol = w.style.left || w.offsetLeft + 'px'; w.classList.add('maximized'); }
    bringToFront(w);
    if (id === 'paintWindow') requestAnimationFrame(resizePaintCanvas);
}

function snapWindow(id, pos) {
    const w = document.getElementById(id);
    if (!w || !w.classList.contains('active')) { openApp(id); return; }
    w.classList.remove('maximized');
    const vw = window.innerWidth, vh = window.innerHeight;
    if (pos === 'left') { w.style.top = '0'; w.style.left = '0'; w.style.width = (vw / 2) + 'px'; w.style.height = vh + 'px'; }
    if (pos === 'right') { w.style.top = '0'; w.style.left = (vw / 2) + 'px'; w.style.width = (vw / 2) + 'px'; w.style.height = vh + 'px'; }
    bringToFront(w);
    if (id === 'paintWindow') requestAnimationFrame(resizePaintCanvas);
}

document.addEventListener('keydown', (e) => {
    if (e.altKey) {
        switch (e.key.toLowerCase()) {
            case 't': e.preventDefault(); openApp('tasks'); break;
            case 'n': e.preventDefault(); openApp('notes'); break;
            case 'c': e.preventDefault(); openApp('calc'); break;
            case 'w': e.preventDefault(); if (activeWindow) closeApp(activeWindow); break;
            case 's': e.preventDefault(); openApp('settings'); break;
            case 'p': e.preventDefault(); openApp('timer'); break;
            case 'a': e.preventDefault(); openApp('customAppsManager'); break;
        }
    }
    if (e.key === 'Escape' && activeWindow) closeApp(activeWindow);
    if (e.altKey && activeWindow) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); snapWindow(activeWindow, 'left'); }
        if (e.key === 'ArrowRight') { e.preventDefault(); snapWindow(activeWindow, 'right'); }
        if (e.key === 'ArrowUp') { e.preventDefault(); maximizeApp(activeWindow); }
    }
});

function openExternal(url) { if (document.body.classList.contains('deep-focus')) return;
    window.open(url, '_blank'); }

function bringToFront(el) { highestZ++;
    el.style.zIndex = highestZ; }
document.querySelectorAll('.window').forEach(w => {
    w.addEventListener('mousedown', () => { bringToFront(w);
        activeWindow = w.id; });
    const tb = w.querySelector('.titlebar');
    if (tb) {
        tb.onmousedown = function(e) {
            if (e.target.tagName === 'BUTTON' || w.classList.contains('maximized')) return;
            e.preventDefault();
            let x = e.clientX - w.offsetLeft,
                y = e.clientY - w.offsetTop;
            document.onmousemove = function(e) { w.style.left = (e.clientX - x) + 'px';
                w.style.top = (e.clientY - y) + 'px'; };
            document.onmouseup = function() { document.onmousemove = null; };
        };
    }
});

const desktopShortcuts = document.getElementById('desktopShortcuts');
let savedDesktopShortcuts = JSON.parse(localStorage.getItem('desktopShortcuts') || '[]');
let selectionStart = null;
const selectionBox = document.createElement('div');
selectionBox.className = 'desktop-selection-box';
desktopShortcuts.appendChild(selectionBox);
const appIconMap = {
    timer: 'https://img.icons8.com/fluency/48/timer.png',
    tasks: 'https://img.icons8.com/fluency/48/task.png',
    calc: 'https://img.icons8.com/fluency/48/calculator.png',
    notes: 'https://img.icons8.com/fluency/48/note.png',
    stats: 'https://img.icons8.com/fluency/48/combo-chart.png',
    settings: 'https://img.icons8.com/fluency/48/settings.png',
    calendarWindow: 'https://img.icons8.com/fluency/48/calendar.png',
    terminalWindow: 'https://img.icons8.com/fluency/48/console.png',
    weatherDetails: 'https://img.icons8.com/fluency/48/partly-cloudy-day.png',
    songboxWindow: 'https://img.icons8.com/fluency/48/music.png',
    customAppsManager: 'https://img.icons8.com/fluency/48/add.png'
};

function launcherDetails(source) {
    const onclick = source.getAttribute('onclick') || '';
    const appMatch = onclick.match(/openApp\(['"]([^'"]+)['"]\)/);
    const customMatch = onclick.match(/openCustomApp\((\d+)\)/);
    const externalMatch = onclick.match(/openExternal\(['"]([^'"]+)['"]\)/);
    const icon = source.querySelector('img');
    if (appMatch) return { type: 'app', id: appMatch[1], name: icon?.title || appMatch[1], icon: icon?.src || appIconMap[appMatch[1]] || 'https://img.icons8.com/fluency/48/application.png' };
    if (customMatch) return { type: 'custom', id: Number(customMatch[1]), name: icon?.title || 'Custom app', icon: icon?.src || '' };
    if (externalMatch) {
        const url = externalMatch[1];
        let favicon = icon?.src || 'https://img.icons8.com/fluency/48/globe.png';
        try { favicon = icon?.src || 'https://www.google.com/s2/favicons?domain=' + new URL(url).hostname + '&sz=128'; } catch (e) {}
        return { type: 'external', url, name: source.textContent.trim(), icon: favicon };
    }
    return null;
}

function enableLauncherDragging() {
    document.querySelectorAll('.dock .icon, .start-menu .menu-item').forEach(source => {
        if (launcherDetails(source)) source.draggable = true;
    });
}

function saveDesktopShortcuts() {
    localStorage.setItem('desktopShortcuts', JSON.stringify(savedDesktopShortcuts));
}

function findFreeShortcutPosition(x, y, excludedIndex = -1) {
    const width = 78;
    const height = 78;
    const gap = 8;
    const bounds = desktopShortcuts.getBoundingClientRect();
    const maxX = Math.max(0, bounds.width - width);
    const maxY = Math.max(0, bounds.height - height);
    const desiredX = Math.max(0, Math.min(maxX, x));
    const desiredY = Math.max(0, Math.min(maxY, y));
    const overlaps = (candidateX, candidateY, shortcut) => candidateX < shortcut.x + width + gap && candidateX + width + gap > shortcut.x && candidateY < shortcut.y + height + gap && candidateY + height + gap > shortcut.y;
    let closest = null;
    let closestDistance = Infinity;
    for (let candidateY = 0; candidateY <= maxY; candidateY += height + gap) {
        for (let candidateX = 0; candidateX <= maxX; candidateX += width + gap) {
            const occupied = savedDesktopShortcuts.some((shortcut, index) => index !== excludedIndex && overlaps(candidateX, candidateY, shortcut));
            if (!occupied) {
                const distance = (candidateX - desiredX) ** 2 + (candidateY - desiredY) ** 2;
                if (distance < closestDistance) {
                    closest = { x: candidateX, y: candidateY };
                    closestDistance = distance;
                }
            }
        }
    }
    return closest;
}

function openDesktopShortcut(shortcut) {
    if (shortcut.type === 'app') openApp(shortcut.id);
    if (shortcut.type === 'custom') openCustomApp(shortcut.id);
    if (shortcut.type === 'external') openExternal(shortcut.url);
}

function renderDesktopShortcuts() {
    desktopShortcuts.querySelectorAll('.desktop-shortcut').forEach(item => item.remove());
    savedDesktopShortcuts.forEach((shortcut, index) => {
        const item = document.createElement('div');
        item.className = 'desktop-shortcut';
        item.draggable = true;
        item.style.left = shortcut.x + 'px';
        item.style.top = shortcut.y + 'px';
        item.innerHTML = `<img src="${shortcut.icon}" onerror="this.src='https://img.icons8.com/fluency/48/globe.png'" /><span title="${shortcut.name}">${shortcut.name}</span>`;
        item.addEventListener('dblclick', () => openDesktopShortcut(shortcut));
        item.addEventListener('contextmenu', event => {
            event.preventDefault();
            savedDesktopShortcuts.splice(index, 1);
            saveDesktopShortcuts();
            renderDesktopShortcuts();
        });
        item.addEventListener('dragstart', event => {
            event.stopPropagation();
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', event => {
            item.classList.remove('dragging');
            const bounds = desktopShortcuts.getBoundingClientRect();
            const desiredX = event.clientX - bounds.left - item.offsetWidth / 2;
            const desiredY = event.clientY - bounds.top - item.offsetHeight / 2;
            const position = findFreeShortcutPosition(desiredX, desiredY, index);
            if (position) {
                shortcut.x = position.x;
                shortcut.y = position.y;
            }
            item.style.left = shortcut.x + 'px';
            item.style.top = shortcut.y + 'px';
            saveDesktopShortcuts();
        });
        desktopShortcuts.appendChild(item);
    });
}

enableLauncherDragging();
new MutationObserver(enableLauncherDragging).observe(document.getElementById('startMenu'), { childList: true, subtree: true });
desktopShortcuts.addEventListener('pointerdown', event => {
    if (event.target !== desktopShortcuts) return;
    selectionStart = { x: event.offsetX, y: event.offsetY, additive: event.ctrlKey || event.metaKey };
    if (!selectionStart.additive) desktopShortcuts.querySelectorAll('.desktop-shortcut.selected').forEach(item => item.classList.remove('selected'));
    selectionBox.style.left = selectionStart.x + 'px';
    selectionBox.style.top = selectionStart.y + 'px';
    selectionBox.style.width = '0';
    selectionBox.style.height = '0';
    selectionBox.style.display = 'block';
    desktopShortcuts.setPointerCapture(event.pointerId);
});
desktopShortcuts.addEventListener('pointermove', event => {
    if (!selectionStart) return;
    const currentX = event.offsetX;
    const currentY = event.offsetY;
    const left = Math.min(selectionStart.x, currentX);
    const top = Math.min(selectionStart.y, currentY);
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = Math.abs(currentX - selectionStart.x) + 'px';
    selectionBox.style.height = Math.abs(currentY - selectionStart.y) + 'px';
    const boxRight = left + Math.abs(currentX - selectionStart.x);
    const boxBottom = top + Math.abs(currentY - selectionStart.y);
    desktopShortcuts.querySelectorAll('.desktop-shortcut').forEach(item => {
        const itemLeft = item.offsetLeft;
        const itemTop = item.offsetTop;
        const intersects = itemLeft < boxRight && itemLeft + item.offsetWidth > left && itemTop < boxBottom && itemTop + item.offsetHeight > top;
        if (intersects) item.classList.add('selected');
        else if (!selectionStart.additive) item.classList.remove('selected');
    });
});
desktopShortcuts.addEventListener('pointerup', event => {
    if (!selectionStart) return;
    selectionBox.style.display = 'none';
    selectionStart = null;
    desktopShortcuts.releasePointerCapture(event.pointerId);
});
document.addEventListener('keydown', event => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.matches('input, textarea, [contenteditable="true"]'))) return;
    const selectedIndexes = [...desktopShortcuts.querySelectorAll('.desktop-shortcut.selected')]
        .map(item => [...desktopShortcuts.querySelectorAll('.desktop-shortcut')].indexOf(item));
    if (!selectedIndexes.length) return;
    event.preventDefault();
    savedDesktopShortcuts = savedDesktopShortcuts.filter((shortcut, index) => !selectedIndexes.includes(index));
    saveDesktopShortcuts();
    renderDesktopShortcuts();
});
document.addEventListener('dragstart', event => {
    const source = event.target.closest('.dock .icon, .start-menu .menu-item');
    const details = source && launcherDetails(source);
    if (!details) return;
    event.dataTransfer.setData('application/x-magos-launcher', JSON.stringify(details));
    event.dataTransfer.effectAllowed = 'copy';
});
desktopShortcuts.addEventListener('dragover', event => {
    event.preventDefault();
    desktopShortcuts.classList.add('drop-target');
});
desktopShortcuts.addEventListener('dragleave', () => desktopShortcuts.classList.remove('drop-target'));
desktopShortcuts.addEventListener('drop', event => {
    event.preventDefault();
    desktopShortcuts.classList.remove('drop-target');
    const raw = event.dataTransfer.getData('application/x-magos-launcher');
    if (!raw) return;
    const shortcut = JSON.parse(raw);
    const bounds = desktopShortcuts.getBoundingClientRect();
    const position = findFreeShortcutPosition(event.clientX - bounds.left - 39, event.clientY - bounds.top - 39);
    if (!position) return;
    shortcut.x = position.x;
    shortcut.y = position.y;
    savedDesktopShortcuts.push(shortcut);
    saveDesktopShortcuts();
    renderDesktopShortcuts();
});
renderDesktopShortcuts();

// =========================
// 4) BUILT-IN APPS
// =========================
let workTime = 25 * 60;
let breakTime = 5 * 60;
let totalTime = workTime;
let timer;
let running = false;
let isWorkMode = true;

function updateDisplay() {
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    getElement('time').innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    getElement('mode').innerText = isWorkMode ? 'Work' : 'Break';
}

function switchMode() {
    if (isWorkMode) completeSession();
    isWorkMode = !isWorkMode;
    totalTime = isWorkMode ? workTime : breakTime;
    updateDisplay();

    if (Notification.permission === 'granted') {
        new Notification('Study OS', { body: isWorkMode ? 'Back to Work!' : 'Break Time!' });
    }
}

if (Notification.permission === 'default') {
    Notification.requestPermission();
}

function startTimer() {
    if (running) return;
    running = true;
    timer = setInterval(() => {
        if (totalTime <= 0) {
            switchMode();
        } else {
            totalTime--;
        }
        updateDisplay();
    }, 1000);
}

function pauseTimer() {
    clearInterval(timer);
    running = false;
}

function resetTimer() {
    clearInterval(timer);
    running = false;
    isWorkMode = true;
    totalTime = workTime;
    updateDisplay();
}

updateDisplay();

let sessionsCompleted = Number(localStorage.getItem('sessionsCompleted') || 0);

function updateStats() {
    getElement('studySessions').innerText = `Sessions: ${sessionsCompleted}`;
}

function completeSession() {
    sessionsCompleted += 1;
    localStorage.setItem('sessionsCompleted', String(sessionsCompleted));
    updateStats();
}

updateStats();

let calculatorValue = '';
let calculatorHistory = [];
const calculatorDisplay = getElement('display');
const historyPanel = getElement('historyPanel');

function press(value) {
    calculatorValue += value;
    calculatorDisplay.value = calculatorValue;
}

function clearCalc() {
    calculatorValue = '';
    calculatorDisplay.value = '';
}

function calculate() {
    try {
        const result = Function(`"use strict";return (${calculatorValue})`)();
        calculatorHistory.unshift(`${calculatorValue} = ${result}`);
        calculatorDisplay.value = result;
        calculatorValue = String(result);
        historyPanel.innerHTML = calculatorHistory.slice(0, 4).join('<br>');
    } catch (error) {
        calculatorDisplay.value = 'Error';
    }
}

const taskInput = getElement('taskInput');
const taskList = getElement('taskList');

function addTask() {
    if (!taskInput.value.trim()) return;

    const listItem = document.createElement('li');
    listItem.innerText = taskInput.value;
    listItem.onclick = () => listItem.remove();

    taskList.appendChild(listItem);
    taskInput.value = '';
}

taskInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') addTask();
});

const note = getElement('note');
note.value = localStorage.getItem('note') || '';
note.oninput = () => localStorage.setItem('note', note.value);

const savedWallpaper = localStorage.getItem('wallpaper');
if (savedWallpaper) setWallpaper(savedWallpaper);
const savedEffect = localStorage.getItem('effectType') || 'none';
setEffect(savedEffect);

const savedLive = localStorage.getItem('liveWallpaper');
if (savedLive) {
    try { const d = JSON.parse(savedLive);
        setTimeout(() => setLiveWallpaper(d.source, d.name), 500); } catch (e) {}
}

// =========================
// 5) FOCUS / FULLSCREEN / PAINT
// =========================
let deepFocusActive = false;

function toggleDeepFocus() {
    deepFocusActive = !deepFocusActive;
    document.body.classList.toggle('deep-focus', deepFocusActive);

    if (deepFocusActive) {
        const songbox = getElement('songboxWindow');
        if (songbox && songbox.classList.contains('active')) closeApp('songboxWindow');
        const startMenu = getElement('startMenu');
        if (startMenu) startMenu.classList.remove('active');
    }

    localStorage.setItem('deepFocus', deepFocusActive ? 'true' : 'false');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(error => console.log('Fullscreen error:', error));
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

document.addEventListener('fullscreenchange', () => {
    const button = document.querySelector('.fullscreen-toggle');
    if (button) {
        button.textContent = document.fullscreenElement ? '⛶ Exit' : '⛶ Fullscreen';
    }
});

if (localStorage.getItem('deepFocus') === 'true') {
    setTimeout(toggleDeepFocus, 400);
}

let paintContext;
let paintDrawing = false;
let paintTool = 'brush';

function resizePaintCanvas() {
    const canvas = document.getElementById('paintCanvas');
    if (!canvas) return;
    const previous = canvas.width && canvas.height ? canvas.toDataURL() : null;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    paintContext = canvas.getContext('2d');
    paintContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintContext.fillStyle = '#ffffff';
    paintContext.fillRect(0, 0, rect.width, rect.height);
    if (previous) {
        const image = new Image();
        image.onload = () => paintContext.drawImage(image, 0, 0, rect.width, rect.height);
        image.src = previous;
    }
}

function paintPoint(event) {
    const canvas = document.getElementById('paintCanvas');
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function drawPaint(event) {
    if (!paintDrawing || !paintContext) return;
    const point = paintPoint(event);
    const size = Number(document.getElementById('paintSize').value);
    paintContext.lineWidth = size;
    paintContext.lineCap = 'round';
    paintContext.lineJoin = 'round';
    paintContext.strokeStyle = paintTool === 'eraser' ? '#ffffff' : document.getElementById('paintColor').value;
    paintContext.lineTo(point.x, point.y);
    paintContext.stroke();
    paintContext.beginPath();
    paintContext.moveTo(point.x, point.y);
}

function setPaintTool(tool) {
    paintTool = tool;
    document.getElementById('paintBrush').classList.toggle('active', tool === 'brush');
    document.getElementById('paintEraser').classList.toggle('active', tool === 'eraser');
}

function clearPaintCanvas() {
    const canvas = document.getElementById('paintCanvas');
    if (!paintContext || !canvas) return;
    paintContext.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    paintContext.fillStyle = '#ffffff';
    paintContext.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function downloadPaint() {
    const canvas = document.getElementById('paintCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'magos-painting.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function initializePaint() {
    const canvas = getElement('paintCanvas');
    const size = getElement('paintSize');
    if (!canvas || !size || canvas.dataset.ready) return;

    canvas.dataset.ready = 'true';
    resizePaintCanvas();

    size.addEventListener('input', () => {
        getElement('paintSizeValue').textContent = `${size.value} px`;
    });

    canvas.addEventListener('pointerdown', event => {
        paintDrawing = true;
        canvas.setPointerCapture(event.pointerId);
        const point = paintPoint(event);
        paintContext.beginPath();
        paintContext.moveTo(point.x, point.y);
        drawPaint(event);
    });

    canvas.addEventListener('pointermove', drawPaint);
    canvas.addEventListener('pointerup', () => {
        paintDrawing = false;
        paintContext.closePath();
    });
    canvas.addEventListener('pointercancel', () => {
        paintDrawing = false;
        paintContext.closePath();
    });

    window.addEventListener('resize', resizePaintCanvas);
}

initializePaint();

// =========================
// 6) SCREEN RECORDER
// =========================
const recorderUi = {
    start: document.getElementById('startRecordBtn'),
    stop: document.getElementById('stopRecordBtn'),
    status: document.getElementById('recordingStatus'),
    list: document.getElementById('recordingsList')
};

let recorderState = {
    active: false,
    stream: null,
    recorder: null,
    chunks: [],
    recordings: JSON.parse(localStorage.getItem('screenRecordings') || '[]')
};

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index++;
    }
    return value.toFixed(1) + ' ' + units[index];
}

function setRecorderStatus(message, isError = false) {
    if (!recorderUi.status) return;
    recorderUi.status.textContent = message;
    recorderUi.status.style.color = isError ? '#fda4af' : 'rgba(255,255,255,0.75)';
}

function updateRecorderButtons() {
    if (!recorderUi.start || !recorderUi.stop) return;
    recorderUi.start.style.display = recorderState.active ? 'none' : 'inline-block';
    recorderUi.stop.style.display = recorderState.active ? 'inline-block' : 'none';
}

function renderRecorderList() {
    if (!recorderUi.list) return;
    if (!recorderState.recordings.length) {
        recorderUi.list.innerHTML = '<div class="recorder-list-empty">No recordings yet</div>';
        return;
    }

    recorderUi.list.innerHTML = recorderState.recordings.map(recording => `
        <div class="recorder-item">
            <div class="meta">
                <strong>${recording.name}</strong>
                <span>${formatBytes(recording.size)} • ${new Date(recording.createdAt).toLocaleString()}</span>
            </div>
            <div class="actions">
                <button onclick="downloadRecording('${recording.id}')">⬇️</button>
                <button onclick="removeRecording('${recording.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function saveRecorderRecordings() {
    localStorage.setItem('screenRecordings', JSON.stringify(recorderState.recordings));
    renderRecorderList();
}

function downloadRecording(id) {
    const recording = recorderState.recordings.find(item => String(item.id) === String(id));
    if (!recording) return;
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = recording.name;
    link.click();
}

function removeRecording(id) {
    const recording = recorderState.recordings.find(item => String(item.id) === String(id));
    if (!recording) return;
    if (recording.url) URL.revokeObjectURL(recording.url);
    recorderState.recordings = recorderState.recordings.filter(item => String(item.id) !== String(id));
    saveRecorderRecordings();
}

function clearRecordings() {
    recorderState.recordings.forEach(recording => {
        if (recording.url) URL.revokeObjectURL(recording.url);
    });
    recorderState.recordings = [];
    saveRecorderRecordings();
    setRecorderStatus('🧹 Cleared all recordings');
}

async function startScreenRecording() {
    if (recorderState.active) return;
    if (location.protocol === 'file:') {
        setRecorderStatus('Open this app from localhost or HTTPS for screen recording.', true);
        return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
        setRecorderStatus('Screen capture is not supported in this browser.', true);
        return;
    }

    try {
        setRecorderStatus('Requesting screen access…');
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30, cursor: 'always' },
            audio: false
        });

        const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

        recorderState.active = true;
        recorderState.stream = stream;
        recorderState.recorder = recorder;
        recorderState.chunks = [];
        updateRecorderButtons();

        recorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) recorderState.chunks.push(event.data);
        };

        recorder.onstop = () => {
            const mime = recorder.mimeType || 'video/webm';
            const blob = new Blob(recorderState.chunks, { type: mime });
            const recording = {
                id: Date.now(),
                name: `recording-${Date.now()}.webm`,
                url: URL.createObjectURL(blob),
                size: blob.size,
                createdAt: new Date().toISOString()
            };

            recorderState.recordings.unshift(recording);
            recorderState.recordings = recorderState.recordings.slice(0, 8);
            saveRecorderRecordings();
            setRecorderStatus(`Saved ${recording.name}`);

            if (recorderState.stream) {
                recorderState.stream.getTracks().forEach(track => track.stop());
            }
            recorderState.stream = null;
            recorderState.recorder = null;
            recorderState.chunks = [];
            recorderState.active = false;
            updateRecorderButtons();
        };

        recorder.start();
        setRecorderStatus('Recording in progress…');
        stream.getTracks().forEach(track => {
            track.addEventListener('ended', () => {
                if (recorderState.active) stopScreenRecording();
            }, { once: true });
        });
    } catch (error) {
        recorderState.active = false;
        updateRecorderButtons();
        setRecorderStatus(`Unable to start recording: ${error.message}`, true);
    }
}

function stopScreenRecording() {
    if (!recorderState.active || !recorderState.recorder) return;
    setRecorderStatus('Finishing recording…');
    recorderState.recorder.stop();
}

updateRecorderButtons();
renderRecorderList();

// =========================
// 7) THEMES
// =========================
const themes = {
    'Dark Void': { bg: '#0a0a0f', accent: '#6c5ce7', glass: 'rgba(10,10,15,0.85)', text: '#ffffff', border: 'rgba(255,255,255,0.06)' },
    'Deep Space': { bg: '#0a0e1a', accent: '#3b82f6', glass: 'rgba(10,14,26,0.85)', text: '#ffffff', border: 'rgba(59,130,246,0.1)' },
    'Midnight': { bg: '#0c0c1e', accent: '#8b5cf6', glass: 'rgba(12,12,30,0.85)', text: '#ffffff', border: 'rgba(139,92,246,0.1)' },
    'Onyx': { bg: '#0d0d0d', accent: '#f59e0b', glass: 'rgba(13,13,13,0.85)', text: '#ffffff', border: 'rgba(245,158,11,0.1)' },
    'Pure Light': { bg: '#f0f2f5', accent: '#2563eb', glass: 'rgba(240,242,245,0.85)', text: '#1a1a2e', border: 'rgba(0,0,0,0.06)' },
    'Cloud': { bg: '#e8edf5', accent: '#7c3aed', glass: 'rgba(232,237,245,0.85)', text: '#1a1a2e', border: 'rgba(0,0,0,0.05)' },
    'Purple Haze': { bg: '#1a0a2e', accent: '#a855f7', glass: 'rgba(26,10,46,0.85)', text: '#ffffff', border: 'rgba(168,85,247,0.12)' },
    'Blue Ocean': { bg: '#0a1628', accent: '#0ea5e9', glass: 'rgba(10,22,40,0.85)', text: '#ffffff', border: 'rgba(14,165,233,0.1)' },
    'Green Forest': { bg: '#0a1a0a', accent: '#10b981', glass: 'rgba(10,26,10,0.85)', text: '#ffffff', border: 'rgba(16,185,129,0.1)' },
    'Sunset Orange': { bg: '#1a0a0a', accent: '#f59e0b', glass: 'rgba(26,10,10,0.85)', text: '#ffffff', border: 'rgba(245,158,11,0.12)' },
    'Crimson': { bg: '#1a0508', accent: '#ef4444', glass: 'rgba(26,5,8,0.85)', text: '#ffffff', border: 'rgba(239,68,68,0.12)' },
    'Teal': { bg: '#0a1414', accent: '#2dd4bf', glass: 'rgba(10,20,20,0.85)', text: '#ffffff', border: 'rgba(45,212,191,0.12)' }
};

let currentFilter = 'all';

function saveTheme(name) { localStorage.setItem('savedTheme', name); }
function loadTheme() { 
    const saved = localStorage.getItem('savedTheme');
    return (saved && themes[saved]) ? saved : null;
}
function saveBackground(url) { if (url && url !== 'black') localStorage.setItem('savedBackground', url); }
function loadBackground() { return localStorage.getItem('savedBackground') || null; }

function applyTheme(name) {
    const theme = themes[name];
    if (!theme) return;
    const savedWallpaper = loadBackground();
    if (liveActive) {
        document.body.style.background = 'transparent';
    } else if (savedWallpaper) {
        document.body.style.background = `url('${savedWallpaper}') center/cover fixed`;
    } else {
        document.body.style.background = theme.bg;
    }
    document.body.style.color = theme.text;
    document.querySelectorAll('.dock, .start-menu, .window, .glass, .top-dock, #notificationPanel').forEach(el => {
        if (el) {
            el.style.background = theme.glass;
            el.style.borderColor = theme.border;
            el.style.color = theme.text;
        }
    });
    document.querySelectorAll('.titlebar span, .menu-item, .start-menu h3, .weather-widget, .dock-actions span, .td-item, .taskbar-clock').forEach(el => {
        if (el) el.style.color = theme.text;
    });
    document.querySelectorAll('.menu-item:hover span.dot').forEach(el => {
        if (el) el.style.background = theme.accent;
    });
    saveTheme(name);
    renderThemes(currentFilter);
}

function createThemeStore() {
    let win = document.getElementById('themeStore');
    if (win) {
        win.style.display = 'block';
        win.classList.add('active');
        return;
    }
    win = document.createElement('div');
    win.id = 'themeStore';
    win.className = 'window';
    win.style.width = '520px';
    win.style.minHeight = '440px';
    win.style.maxHeight = '80vh';
    win.style.background = 'rgba(15,16,22,0.92)';
    win.style.backdropFilter = 'blur(30px)';
    win.style.border = '1px solid rgba(255,255,255,0.08)';
    win.style.borderRadius = '20px';
    win.style.boxShadow = '0 30px 80px rgba(0,0,0,0.6)';
    win.style.overflow = 'hidden';
    win.style.position = 'fixed';
    win.style.top = '100px';
    win.style.left = '100px';
    win.style.zIndex = '99999';
    win.style.display = 'none';
    win.innerHTML = `
        <div class="titlebar" style="cursor:move;padding:14px 18px 10px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
            <span style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:rgba(255,255,255,0.9);letter-spacing:0.3px;"><img src="https://img.icons8.com/fluency/48/control-panel.png" alt="" style="width:20px;height:20px;" />Theme Studio</span>
            <div class="window-controls" style="display:flex;gap:4px;">
                <button onclick="closeThemeStore()" style="background:transparent;border:none;color:rgba(255,255,255,0.3);padding:2px 10px;cursor:pointer;border-radius:6px;font-size:14px;transition:0.2s;">−</button>
                <button onclick="closeThemeStore()" style="background:transparent;border:none;color:rgba(255,255,255,0.3);padding:2px 10px;cursor:pointer;border-radius:6px;font-size:14px;transition:0.2s;">◻</button>
                <button onclick="closeThemeStore()" class="close" style="background:transparent;border:none;color:rgba(255,255,255,0.3);padding:2px 10px;cursor:pointer;border-radius:6px;font-size:14px;transition:0.2s;">✕</button>
            </div>
        </div>
        <div style="padding:14px 18px 16px;">
            <div style="display:flex;gap:6px;margin-bottom:12px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                <input id="wallpaperInput" placeholder="Enter wallpaper URL..." style="flex:1;background:transparent;border:none;color:#fff;font-size:12px;outline:none;padding:4px 0;" />
                <button onclick="applyWallpaper()" style="padding:4px 14px;border-radius:10px;background:rgba(108,92,231,0.2);border:1px solid rgba(108,92,231,0.2);color:#fff;cursor:pointer;font-size:11px;transition:0.2s;">Apply</button>
                <button onclick="resetWallpaper()" style="padding:4px 14px;border-radius:10px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.2);color:#ef4444;cursor:pointer;font-size:11px;transition:0.2s;">Reset</button>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
                <button onclick="filterThemes('all', this)" class="active" style="flex:1;padding:7px 12px;border-radius:20px;border:1px solid rgba(108,92,231,0.3);background:rgba(108,92,231,0.15);color:#fff;cursor:pointer;font-size:11px;font-weight:500;transition:0.2s;">All</button>
                <button onclick="filterThemes('dark', this)" style="flex:1;padding:7px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);cursor:pointer;font-size:11px;font-weight:500;transition:0.2s;">Dark</button>
                <button onclick="filterThemes('light', this)" style="flex:1;padding:7px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);cursor:pointer;font-size:11px;font-weight:500;transition:0.2s;">Light</button>
                <button onclick="filterThemes('colorful', this)" style="flex:1;padding:7px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);cursor:pointer;font-size:11px;font-weight:500;transition:0.2s;">Colorful</button>
                <button onclick="randomTheme()" style="flex:0.8;padding:7px 12px;border-radius:20px;border:1px solid rgba(245,158,11,0.2);background:rgba(245,158,11,0.1);color:#f59e0b;cursor:pointer;font-size:11px;font-weight:500;transition:0.2s;">Random</button>
            </div>
            <div id="themeGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:320px;overflow-y:auto;padding:2px;"></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0 2px;opacity:0.15;font-size:10px;letter-spacing:0.5px;">
                <span>${Object.keys(themes).length} themes</span>
                <span>Auto-saved</span>
            </div>
        </div>
    `;
    document.body.appendChild(win);
    const titlebar = win.querySelector('.titlebar');
    let isDragging = false, offsetX, offsetY;
    titlebar.addEventListener('mousedown', function(e) {
        if (e.target.closest('.window-controls')) return;
        isDragging = true;
        const rect = win.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        win.style.cursor = 'grabbing';
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        x = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - win.offsetHeight - 50, y));
        win.style.left = x + 'px';
        win.style.top = y + 'px';
        win.style.right = 'auto';
        win.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            win.style.cursor = 'default';
        }
    });
    renderThemes('all');
    win.style.display = 'block';
    win.classList.add('active');
}

function closeThemeStore() {
    const win = document.getElementById('themeStore');
    if (win) {
        win.style.display = 'none';
        win.classList.remove('active');
    }
}

function filterThemes(category, btn) {
    currentFilter = category;
    document.querySelectorAll('#themeStore .ts-filters button').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.03)';
        b.style.borderColor = 'rgba(255,255,255,0.06)';
        b.style.color = 'rgba(255,255,255,0.5)';
    });
    if (btn) {
        btn.style.background = 'rgba(108,92,231,0.15)';
        btn.style.borderColor = 'rgba(108,92,231,0.3)';
        btn.style.color = '#fff';
    }
    renderThemes(category);
}

function renderThemes(category) {
    const grid = document.getElementById('themeGrid');
    if (!grid) return;
    const themeList = Object.keys(themes);
    const filtered = category === 'all' ? themeList : themeList.filter(name => {
        const t = themes[name];
        if (category === 'dark') return t.bg.includes('0a') || t.bg.includes('0c') || t.bg.includes('0d');
        if (category === 'light') return t.bg.includes('f0') || t.bg.includes('e8');
        if (category === 'colorful') return !t.bg.includes('f0') && !t.bg.includes('e8') && !t.bg.includes('0a0a0f') && !t.bg.includes('0a0e1a') && !t.bg.includes('0c0c1e') && !t.bg.includes('0d0d0d');
        return true;
    });
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.3;padding:30px;font-size:13px;">No themes in this category</div>';
        return;
    }
    const currentTheme = loadTheme();
    grid.innerHTML = filtered.map(name => {
        const theme = themes[name];
        const isActive = currentTheme === name;
        return `
            <div style="padding:14px 10px;border-radius:14px;background:${theme.bg};border:2px solid ${isActive ? theme.accent : 'rgba(255,255,255,0.06)'};cursor:pointer;text-align:center;transition:0.25s;${isActive ? 'box-shadow: 0 0 30px ' + theme.accent + '33;' : ''}" 
                 onmouseover="this.style.transform='scale(1.04)';this.style.borderColor='${theme.accent}'" 
                 onmouseout="this.style.transform='scale(1)';this.style.borderColor='${isActive ? theme.accent : 'rgba(255,255,255,0.06)'}'"
                 onclick="applyTheme('${name}')">
                <div style="display:flex;gap:5px;justify-content:center;margin-bottom:6px;">
                    <span style="width:24px;height:24px;border-radius:6px;background:${theme.accent};"></span>
                    <span style="width:24px;height:24px;border-radius:6px;background:${theme.bg};border:1px solid ${theme.border};"></span>
                    <span style="width:24px;height:24px;border-radius:6px;background:${theme.text};"></span>
                </div>
                <div style="font-weight:500;color:${theme.text};font-size:12px;">${name}</div>
                ${isActive ? '<div style="font-size:9px;color:' + theme.accent + ';margin-top:3px;">✓ Active</div>' : ''}
            </div>
        `;
    }).join('');
}

function randomTheme() {
    const names = Object.keys(themes);
    const random = names[Math.floor(Math.random() * names.length)];
    applyTheme(random);
}

function applyWallpaper() {
    const input = document.getElementById('wallpaperInput');
    if (!input) return;
    const url = input.value.trim();
    if (!url) { alert('Please enter a URL!'); return; }
    document.body.style.background = `url('${url}') center/cover fixed`;
    saveBackground(url);
    input.value = '';
    alert('✅ Wallpaper saved!');
}

function resetWallpaper() {
    localStorage.removeItem('savedBackground');
    const savedTheme = loadTheme();
    if (savedTheme && themes[savedTheme]) {
        document.body.style.background = themes[savedTheme].bg;
    } else {
        document.body.style.background = '#0a0a0f';
    }
    alert('🔄 Wallpaper reset!');
}

function addThemeToStartMenu() {
    const startMenu = document.getElementById('startMenu');
    if (!startMenu) return;
    if (startMenu.querySelector('.theme-menu-item')) return;
    const customSection = startMenu.querySelector('h3:last-child');
    if (!customSection) return;
    const div = document.createElement('div');
    div.className = 'menu-item theme-menu-item';
    div.innerHTML = `<img class="menu-icon" src="https://img.icons8.com/fluency/48/control-panel.png" alt="" /><span>Theme Studio</span>`;
    div.onclick = function(e) {
        e.stopPropagation();
        createThemeStore();
        document.getElementById('startMenu').classList.remove('active');
    };
    customSection.parentNode.insertBefore(div, customSection);
}

function restoreSavedState() {
    const savedTheme = loadTheme();
    if (savedTheme && themes[savedTheme]) {
        applyTheme(savedTheme);
    } else {
        applyTheme('Dark Void');
    }
    const savedBg = loadBackground();
    if (savedBg) {
        document.body.style.background = `url('${savedBg}') center/cover fixed`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    restoreSavedState();
    addThemeToStartMenu();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function() {
        restoreSavedState();
        addThemeToStartMenu();
    }, 100);
}

if (typeof window.setWallpaper === 'function') {
    const original = window.setWallpaper;
    window.setWallpaper = function(url) {
        original(url);
        if (url && url !== 'black') {
            saveBackground(url);
        }
    };
}