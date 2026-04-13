/**
 * NOUR AL-ISLAM - CORE LOGIC (v3.0)
 * Robust, Clean, and Premium
 */

// Global State
const state = {
    currentView: 'home',
    prayerTimes: null,
    nextPrayer: null,
    quranSurahs: [],
    tasbihCount: 0,
    tasbihTotal: parseInt(localStorage.getItem('tasbihTotal')) || 0,
    tasbihPhrase: 'سبحان الله',
    audio: {
        adhan: new Audio('https://www.islamcan.com/audio/adhan/azan1.mp3'),
        iqama: new Audio('https://www.orangefreesounds.com/wp-content/uploads/2014/10/Ding-sound-effect.mp3'),
        isPlaying: false,
        timeout: null,
        unlocked: false
    },
    iqamaDurations: {
        Fajr: 20,
        Dhuhr: 15,
        Asr: 15,
        Maghrib: 5,
        Isha: 15
    },
    lastAlerted: null,
    wardReminded: false
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    startSplash();
});

// 1. Splash Screen & Initialization
function startSplash() {
    const progress = document.getElementById('splash-progress');
    let width = 0;
    
    const interval = setInterval(() => {
        width += Math.random() * 15;
        if (width >= 100) {
            width = 100;
            clearInterval(interval);
            setTimeout(completeSplash, 500);
        }
        progress.style.width = width + '%';
    }, 150);
}

function completeSplash() {
    document.getElementById('splash-screen').classList.add('fade-out');
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        initCore();
    }, 1000);
}

function initCore() {
    // Basic setup
    updateClock();
    setInterval(updateClock, 1000);
    setDailyVerse();
    
    // Fetch Data
    fetchPrayerTimes();
    fetchQuranList();
    loadTasbih();
    
    // Check for Daily Ward
    checkDailyWard();
    
    // Unlock audio on first touch
    document.addEventListener('click', () => {
        if (!state.audio.unlocked) {
            state.audio.adhan.load();
            state.audio.iqama.load();
            state.audio.unlocked = true;
            console.log("Audio Unlocked");
        }
    }, { once: true });
    
    // Initial Navigation
    navigateTo('home');
}

function checkDailyWard() {
    const lastDate = localStorage.getItem('lastWardDate');
    const today = new Date().toDateString();
    
    if (lastDate !== today) {
        setTimeout(() => {
            showToast("🌙 لا تنسَ وردك اليومي من القرآن والأذكار");
            state.wardReminded = true;
        }, 5000);
    }
}

// 2. Navigation System
function navigateTo(viewId) {
    // Handle special "shortcuts"
    if (viewId === 'azkar-morning') {
        openAzkarCategory('morning');
        return;
    }
    if (viewId === 'azkar-evening') {
        openAzkarCategory('evening');
        return;
    }

    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });

    // Show target view
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        state.currentView = viewId;
        window.scrollTo(0, 0);
        
        // Trigger rendering if section is opened
        if (viewId === 'azkar') renderAzkarCategories();
        if (viewId === 'hisn') renderHisnCategories();
        if (viewId === 'quran') renderQuranList();
        if (viewId === 'tasbih') loadTasbih();
    }

    // Update Nav Icons
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const text = item.querySelector('span').innerText;
        const map = {
            'الرئيسية': 'home',
            'الأذكار': 'azkar',
            'القرآن': 'quran',
            'حصن المسلم': 'hisn',
            'المسبحة': 'tasbih'
        };
        if (map[text] === viewId) item.classList.add('active');
    });
}

// 3. Prayer Times Logic
async function fetchPrayerTimes() {
    const fallbackCity = "Cairo";
    const fallbackCountry = "Egypt";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=5`);
                    const json = await res.json();
                    state.prayerTimes = json.data.timings;
                    updatePrayerUI(json.data);
                } catch (e) {
                    fetchWithFallback(fallbackCity, fallbackCountry);
                }
            },
            () => fetchWithFallback(fallbackCity, fallbackCountry)
        );
    } else {
        fetchWithFallback(fallbackCity, fallbackCountry);
    }
}

async function fetchWithFallback(city, country) {
    try {
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`);
        const json = await res.json();
        state.prayerTimes = json.data.timings;
        updatePrayerUI(json.data);
    } catch (e) {
        console.error("Critical: Could not fetch prayer times", e);
        showToast("فشل في جلب مواقيت الصلاة");
    }
}

function updatePrayerUI(data) {
    const timings = data.timings;
    const map = {
        'Fajr': 'p-fajr',
        'Dhuhr': 'p-dhuhr',
        'Asr': 'p-asr',
        'Maghrib': 'p-maghrib',
        'Isha': 'p-isha'
    };

    for (const [key, id] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) {
            el.querySelector('.p-time').innerText = timings[key];
            
            // Calculate Iqama Time
            const wait = state.iqamaDurations[key] || 15;
            const [ph, pm] = timings[key].split(':').map(Number);
            let ih = ph;
            let im = pm + wait;
            if (im >= 60) {
                ih = (ih + 1) % 24;
                im -= 60;
            }
            const iqamaTag = el.querySelector('.iqama-tag');
            if (iqamaTag) {
                iqamaTag.innerText = `إقامة: ${ih.toString().padStart(2, '0')}:${im.toString().padStart(2, '0')}`;
            }
        }
    }

    // Update Hijri Date
    const h = data.date.hijri;
    document.getElementById('hijri-date').innerText = `${h.day} ${h.month.ar} ${h.year} هـ`;

    calculateNextPrayer();
}

function calculateNextPrayer() {
    if (!state.prayerTimes) return;

    const now = new Date();
    const times = state.prayerTimes;
    const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const arNames = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

    let next = null;
    let minDiff = Infinity;

    order.forEach(type => {
        const [h, m] = times[type].split(':');
        const pDate = new Date();
        pDate.setHours(parseInt(h), parseInt(m), 0);

        let diff = pDate - now;
        if (diff < 0) {
            pDate.setDate(pDate.getDate() + 1);
            diff = pDate - now;
        }

        if (diff < minDiff) {
            minDiff = diff;
            next = { name: arNames[type], key: type, time: pDate };
        }
    });

    state.nextPrayer = next;
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Highlight active in grid
    document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('active'));
    const activeId = `p-${next.key.toLowerCase()}`;
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add('active');
}

function updateCountdown() {
    if (!state.nextPrayer) return;
    const diff = state.nextPrayer.time - new Date();
    if (diff < 0) {
        calculateNextPrayer(); // Refresh if time passed
        return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById('next-prayer-label').innerText = `صلاة ${state.nextPrayer.name} بعد`;
    document.getElementById('next-prayer-countdown').innerText = 
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    // Trigger Athan at 00:00:00
    if (h === 0 && m === 0 && s === 0) {
        const nowKey = state.nextPrayer.key;
        if (state.lastAlerted !== nowKey) {
            triggerAthan(nowKey);
        }
    }
}

function triggerAthan(prayerKey) {
    state.lastAlerted = prayerKey;
    
    // Find name for this specific key (for test button)
    const prayerNames = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
    const pName = prayerNames[prayerKey] || 'الصلاة';
    
    stopAthan();
    state.audio.isPlaying = true;
    
    state.audio.adhan.play().catch(() => showToast("⚠️ اضغط لتفعيل الصوت"));

    // Show Athan Notification (Top Slide)
    const overlay = document.createElement('div');
    overlay.id = 'athan-overlay';
    overlay.className = 'athan-notification-banner';
    overlay.innerHTML = `
        <div class="athan-banner-top">
            <div class="athan-status">
                <div class="athan-dot"></div>
                <span style="font-weight:bold; color:white;">أذان ${pName}</span>
            </div>
            <button class="stop-btn-minimal" onclick="stopAthan()">
                <i class="fas fa-stop"></i> إيقاف
            </button>
        </div>
        
        <div class="athan-banner-content">
            <div style="font-size: 13px; opacity: 0.8; color: white;">
                <i class="fas fa-clock" style="margin-left:5px;"></i> متبقي على الإقامة:
            </div>
            <div class="iqama-countdown-small">
                <h4 id="iqama-timer">--:--</h4>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const waitMins = state.iqamaDurations[prayerKey] || 15;
    let secondsLeft = waitMins * 60;
    
    // Update timer every second
    const timerInterval = setInterval(() => {
        const m = Math.floor(secondsLeft / 60);
        const s = secondsLeft % 60;
        const timerEl = document.getElementById('iqama-timer');
        if (timerEl) {
            timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            state.audio.iqama.play();
            showToast(`🔔 حان موعد إقامة صلاة ${state.nextPrayer ? state.nextPrayer.name : ''}`);
        }
        secondsLeft--;
    }, 1000);

    // Store interval to clear if stopped
    state.audio.timerInterval = timerInterval;
}

function stopAthan() {
    state.audio.adhan.pause();
    state.audio.adhan.currentTime = 0;
    state.audio.isPlaying = false;
    
    // Clear iqama timers
    if (state.audio.timeout) clearTimeout(state.audio.timeout);
    if (state.audio.timerInterval) clearInterval(state.audio.timerInterval);
    
    const banner = document.getElementById('athan-overlay');
    if (banner) {
        banner.style.transform = 'translateY(-150%)';
        setTimeout(() => banner.remove(), 600);
    }
}

// 4. Quran Logic
async function fetchQuranList() {
    try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const json = await res.json();
        state.quranSurahs = json.data;
        if (state.currentView === 'quran') renderQuranList();
    } catch (e) {
        console.error("Quran list fail", e);
    }
}

function renderQuranList() {
    const container = document.getElementById('quran-list-container');
    container.innerHTML = '';
    
    if (state.quranSurahs.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center">جارٍ تحميل قائمة السور...</div>';
        return;
    }

    state.quranSurahs.forEach(surah => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.onclick = () => openSurah(surah.number, surah.name, surah.revelationType, surah.numberOfAyahs);
        item.innerHTML = `
            <div class="item-main">
                <div class="item-icon">${surah.number}</div>
                <div class="item-text">
                    <h4>${surah.name}</h4>
                    <p>${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • ${surah.numberOfAyahs} آيات</p>
                </div>
            </div>
            <i>📖</i>
        `;
        container.appendChild(item);
    });
}

async function openSurah(num, name, type, count) {
    navigateTo('quran-reader');
    const title = document.getElementById('reader-surah-name');
    const meta = document.getElementById('reader-surah-meta');
    const content = document.getElementById('reader-content');

    title.innerText = name;
    meta.innerText = `${type === 'Meccan' ? 'سورة مكية' : 'سورة مدنية'} • ${count} آيات`;
    content.innerHTML = '<div style="text-align:center; padding:40px;">جارٍ تحميل الآيات...</div>';

    // Update last read date for Ward reminder
    localStorage.setItem('lastWardDate', new Date().toDateString());

    try {
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}`);
        const json = await res.json();
        const ayahs = json.data.ayahs;
        
        let html = '';
        
        // Add Bismillah header if not Tawba (9) and not Fatiha (1 - already has it in ayah 1)
        if (num !== 9) {
            html += `<div class="bismillah-header">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>`;
        }

        ayahs.forEach(a => {
            let text = a.text;
            
            // "شيل من ضمن السوره" - Strip Bismillah variations from the first ayah
            if (num !== 1 && num !== 9 && a.numberInSurah === 1) {
                const bismillahVariations = [
                    "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ",
                    "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ"
                ];
                bismillahVariations.forEach(b => {
                    if (text.startsWith(b)) {
                        text = text.replace(b, "").trim();
                    }
                });
            }
            
            html += `${text} <span class="ayah-num">${a.numberInSurah}</span> `;
        });
        
        content.innerHTML = html;
        window.scrollTo(0,0);
    } catch (e) {
        content.innerHTML = '<div style="color:red; text-align:center;">فشل في تحميل السورة. تأكد من اتصالك بالإنترنت.</div>';
    }
}

// 5. Azkar Logic
function renderAzkarCategories() {
    const container = document.getElementById('azkar-list-container');
    container.innerHTML = '';
    
    const cats = [
        { id: 'morning', title: 'أذكار الصباح', icon: '🌅', desc: 'بعد صلاة الفجر' },
        { id: 'evening', title: 'أذكار المساء', icon: '🌙', desc: 'بعد صلاة العصر' },
        { id: 'sleep', title: 'أذكار النوم', icon: '💤', desc: 'قبل النوم' },
        { id: 'afterPrayer', title: 'أذكار بعد الصلاة', icon: '🕌', desc: 'بعد السلام' }
    ];

    cats.forEach(c => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.onclick = () => openAzkarCategory(c.id);
        item.innerHTML = `
            <div class="item-main">
                <div class="item-icon">${c.icon}</div>
                <div class="item-text">
                    <h4>${c.title}</h4>
                    <p>${c.desc}</p>
                </div>
            </div>
            <i>◀</i>
        `;
        container.appendChild(item);
    });
}

function openAzkarCategory(catId) {
    const container = document.getElementById('zekr-cards-container');
    const title = document.getElementById('zekr-reader-title');
    const data = azkarData[catId];
    
    if (!data) return;

    navigateTo('zekr-reader');
    document.querySelector('#view-zekr-reader .icon-btn').onclick = () => navigateTo('azkar');
    title.innerText = catId === 'morning' ? 'أذكار الصباح' : (catId === 'evening' ? 'أذكار المساء' : 'الأذكار');
    container.innerHTML = '';

    data.forEach((z, i) => {
        const card = document.createElement('div');
        card.className = 'zekr-card animate-in';
        card.innerHTML = `
            <div class="card-actions-top">
                <button class="icon-btn small" onclick="copyContent(\`${z.text}\`)"><i class="fas fa-copy"></i></button>
            </div>
            <p class="zekr-arabic">${z.text}</p>
            <p style="font-size:12px; opacity:0.6; margin-bottom:15px;">${z.info || ''}</p>
            <button class="zekr-count-btn" id="zekr-${catId}-${i}" onclick="countZekr('${catId}', ${i}, ${z.count})">
                <span class="count-num">${z.count}</span>
                <span>تكرار</span>
            </button>
        `;
        container.appendChild(card);
    });
}

function countZekr(catId, index, max) {
    const btn = document.getElementById(`zekr-${catId}-${index}`);
    if (btn.classList.contains('done')) return;

    const numEl = btn.querySelector('.count-num');
    let current = parseInt(numEl.innerText);
    
    if (current > 0) {
        current--;
        numEl.innerText = current;
        if(navigator.vibrate) navigator.vibrate(30);
    }

    if (current === 0) {
        btn.classList.add('done');
        btn.innerHTML = '✔ تم';
    }
}

// 6. Azkar System
function renderAzkarCategories() {
    const container = document.getElementById('azkar-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    const categories = [
        { key: 'morning', name: 'أذكار الصباح', icon: '🌅', count: azkarData.morning.length },
        { key: 'evening', name: 'أذكار المساء', icon: '🌙', count: azkarData.evening.length },
        { key: 'sleep', name: 'أذكار النوم', icon: '😴', count: azkarData.sleep.length },
        { key: 'afterPrayer', name: 'أذكار بعد الصلاة', icon: '🕌', count: azkarData.afterPrayer.length }
    ];

    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.onclick = () => openAzkarCategory(cat.key);
        item.innerHTML = `
            <div class="item-main">
                <div class="item-icon" style="background:var(--glow)">${cat.icon}</div>
                <div class="item-text">
                    <h4>${cat.name}</h4>
                    <p>${cat.count} أذكار</p>
                </div>
            </div>
            <i>✨</i>
        `;
        container.appendChild(item);
    });
}

function openAzkarCategory(key) {
    const data = azkarData[key];
    if (!data) return;

    const names = {
        morning: 'أذكار الصباح',
        evening: 'أذكار المساء',
        sleep: 'أذكار النوم',
        afterPrayer: 'أذكار بعد الصلاة'
    };

    const container = document.getElementById('zekr-cards-container');
    const title = document.getElementById('zekr-reader-title');
    
    navigateTo('zekr-reader');
    document.querySelector('#view-zekr-reader .icon-btn').onclick = () => navigateTo('azkar');
    title.innerText = names[key];
    container.innerHTML = '';

    data.forEach((z, index) => {
        const card = document.createElement('div');
        card.id = `zekr-card-${index}`;
        card.className = 'zekr-card animate-in';
        card.innerHTML = `
            <div class="card-count-badge" id="badge-${index}">0 / ${z.count}</div>
            <p class="zekr-arabic">${z.text}</p>
            ${z.info ? `<p class="zekr-bless">${z.info}</p>` : ''}
            <div class="card-footer">
                <button class="count-btn" onclick="handleZekrClick(${index}, ${z.count}, this)">${z.count}</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function handleZekrClick(index, max, btn) {
    let count = parseInt(btn.innerText);
    if (count > 0) {
        count--;
        btn.innerText = count;
        document.getElementById(`badge-${index}`).innerText = `${max - count} / ${max}`;
        if(navigator.vibrate) navigator.vibrate(30);
    }
    if (count === 0) {
        btn.classList.add('done');
        btn.innerHTML = '✔ تم';
    }
}

// 6. Hisn Al-Muslim & Zekr Detail
function openHisnList() {
    renderHisnCategories();
    navigateTo('hisn');
}

function openZekrDetail(id, name) {
    openHisnDetail(id, name);
}

function renderHisnCategories() {
    const container = document.getElementById('hisn-list-container');
    container.innerHTML = '';
    
    hisnCategories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.onclick = () => openHisnDetail(cat.id, cat.name);
        item.innerHTML = `
            <div class="item-main">
                <div class="item-icon" style="background:var(--glow)">${cat.icon}</div>
                <div class="item-text">
                    <h4>${cat.name}</h4>
                    <p>${cat.count} أدعية</p>
                </div>
            </div>
            <i>🛡</i>
        `;
        container.appendChild(item);
    });
}

function openHisnDetail(id, name) {
    const container = document.getElementById('zekr-cards-container');
    const title = document.getElementById('zekr-reader-title');
    
    navigateTo('zekr-reader');
    document.querySelector('#view-zekr-reader .icon-btn').onclick = () => navigateTo('hisn');
    title.innerText = name;
    container.innerHTML = '';

    if (id === 'names99') {
        document.querySelector('#view-zekr-reader .icon-btn').onclick = () => navigateTo('home');
        renderNamesOfAllah(container);
        return;
    }

    const data = hisnDuas[id];
    if (!data) {
        showToast("قريباً إن شاء الله");
        return;
    }

    data.forEach(d => {
        const card = document.createElement('div');
        card.className = 'zekr-card animate-in';
        card.innerHTML = `
            <div class="card-actions-top">
                <button class="icon-btn small" onclick="copyContent(\`${d.arabic}\`)"><i class="fas fa-copy"></i></button>
            </div>
            <h4 style="color:var(--gold-500); margin-bottom:15px;">${d.title}</h4>
            <p class="zekr-arabic">${d.arabic}</p>
            <p style="font-size:14px; opacity:0.5; margin-top:15px;">${d.source || ''}</p>
        `;
        container.appendChild(card);
    });
}

function renderNamesOfAllah(container) {
    const grid = document.createElement('div');
    grid.className = 'names-grid animate-in';
    
    namesOfAllah.forEach(n => {
        const item = document.createElement('div');
        item.className = 'name-item';
        item.onclick = () => showToast(`${n.p}: ${n.m}`);
        item.innerHTML = `
            <div class="name-arabic">${n.p}</div>
            <div class="name-mean">${n.m}</div>
        `;
        grid.appendChild(item);
    });
    container.appendChild(grid);
}

function copyContent(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("تم النسخ إلى الحافظة");
    });
}

// 7. Tasbih Logic
function loadTasbih() {
    document.getElementById('tasbih-count').innerText = state.tasbihCount;
    document.getElementById('tasbih-overall').innerText = state.tasbihTotal;
    document.getElementById('tasbih-phrase').innerText = state.tasbihPhrase;
}

function incrementTasbih() {
    state.tasbihCount++;
    state.tasbihTotal++;
    document.getElementById('tasbih-count').innerText = state.tasbihCount;
    document.getElementById('tasbih-overall').innerText = state.tasbihTotal;
    localStorage.setItem('tasbihTotal', state.tasbihTotal);
    if(navigator.vibrate) navigator.vibrate(40);
}

function resetCurrentTasbih() {
    state.tasbihCount = 0;
    document.getElementById('tasbih-count').innerText = 0;
}

function changeTasbihPhrase() {
    const phrases = ['سبحان الله', 'الحمد لله', 'الله أكبر', 'لا إله إلا الله', 'اللهم صل وسلم على نبينا محمد'];
    let idx = phrases.indexOf(state.tasbihPhrase);
    idx = (idx + 1) % phrases.length;
    state.tasbihPhrase = phrases[idx];
    document.getElementById('tasbih-phrase').innerText = state.tasbihPhrase;
    resetCurrentTasbih();
}

// 8. Utils
function updateClock() {
    const now = new Date();
    // No specific element for clock in header in new design, 
    // but we can use it for calculations if needed.
}

function setDailyVerse() {
    const v = dailyVerses[Math.floor(Math.random() * dailyVerses.length)];
    document.getElementById('daily-verse').innerText = v.text;
    document.getElementById('daily-verse-ref').innerText = v.ref;
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast show';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 400);
    }, 2500);
}

function showPage(id) { navigateTo(id); } // compatibility helper
