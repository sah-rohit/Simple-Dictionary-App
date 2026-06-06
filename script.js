// Lexicon - Modern Dictionary App Script

// Curated Word Lists
const WORD_OF_THE_DAY_LIST = [
    "serendipity", "petrichor", "ephemeral", "mellifluous", "solitude",
    "sonorous", "liminal", "iridescent", "halcyon", "aurora",
    "vellichor", "lucid", "eloquent", "effervescent", "resilient",
    "luminescent", "wanderlust", "oblivion", "defenestration", "lagniappe",
    "coalesce", "quintessential", "capricious", "tenacious", "aquiver",
    "somnambulist", "inundate", "nefarious", "synergy", "panacea", "zeitgeist"
];

const RANDOM_WORDS = [
    "adventure", "bizarre", "calculate", "dynamic", "ecstatic", "flourish", "genuine",
    "harmony", "illuminate", "jovial", "knowledge", "labyrinth", "mystical", "nostalgia",
    "oasis", "paradox", "quench", "radiant", "scintillating", "transcend", "umbrella",
    "vibrant", "whisper", "xenon", "yearning", "zenith", "aesthetic", "benevolent",
    "catalyst", "diligence", "empathy", "frivolous", "gregarious", "heuristic", "indigenous",
    "juxtapose", "kinetic", "loquacious", "metamorphosis", "nuance", "omniscient", "plethora",
    "quixotic", "reverie", "superfluous", "tactile", "ubiquitous", "vociferous", "wistful",
    "zealot", "amorphous", "belligerent", "cacophony", "deference", "evanescent", "fortitude",
    "garrulous", "histrionic", "immutable", "laconic", "magnanimous", "nebulous", "ostentatious",
    "pragmatic", "querulous", "recant", "sycophant", "taciturn", "unctuous", "vacillate",
    "winsome", "abscond", "bombastic", "chicanery", "derision", "equanimity", "fecund",
    "gullible", "hackneyed", "idiosyncrasy", "jargon", "lucrative", "mitigate", "nascent",
    "obdurate", "pedantic", "recalcitrant", "salient", "trepidation", "untenable", "verbose"
];

// Application State
let searchHistory = [];
let bookmarkedWords = [];
let activeAudio = null;

let activeLanguage = 'en';
let historyFilterQuery = "";
let bookmarksFilterQuery = "";

// Initialize App on Load
document.addEventListener("DOMContentLoaded", () => {
    // Inject custom context menu HTML
    createContextMenuHTML();

    loadSettings();
    initEventListeners();
    initModalListeners();
    initOfflineListeners();
    initContextMenuListeners();
    initTouchHoldListeners();
    initLangSelector();
    renderHistory();
    renderBookmarks();

    // Register Service Worker
    registerServiceWorker();

    // Check if there is an active search query in the URL or load Word of the Day implicitly
    const urlParams = new URLSearchParams(window.location.search);
    const queryWord = urlParams.get('word');
    if (queryWord) {
        document.getElementById("word").value = queryWord;
        getMeaning(queryWord);
    }
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
                .catch((err) => console.error('Service Worker registration failed:', err));
        });
    }
}

// Settings & LocalStorage Loading
function loadSettings() {
    // Load theme
    const savedTheme = localStorage.getItem("lexicon_theme") || "dark";
    document.body.className = savedTheme;

    // Update custom select UI representation
    const activeOption = document.querySelector(`.select-options li[data-value="${savedTheme}"]`);
    if (activeOption) {
        document.querySelectorAll("#theme-select-options li").forEach(li => li.classList.remove("active"));
        activeOption.classList.add("active");
        document.getElementById("theme-select-label").textContent = activeOption.textContent;
    }

    // Load History
    const savedHistory = localStorage.getItem("lexicon_history");
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
    }

    // Load Bookmarks
    const savedBookmarks = localStorage.getItem("lexicon_bookmarks");
    if (savedBookmarks) {
        bookmarkedWords = JSON.parse(savedBookmarks);
    }

    // Load Language settings
    const savedLang = localStorage.getItem("lexicon_active_language") || "en";
    activeLanguage = savedLang;

    const activeLangOption = document.querySelector(`#lang-select-options li[data-value="${savedLang}"]`);
    if (activeLangOption) {
        document.querySelectorAll("#lang-select-options li").forEach(li => li.classList.remove("active"));
        activeLangOption.classList.add("active");

        const labelText = activeLangOption.textContent.trim();
        const shortName = labelText.slice(0, 4) + savedLang.toUpperCase().slice(0, 2);
        const langLabel = document.getElementById("lang-select-label");
        if (langLabel) langLabel.textContent = shortName;
    }

    const wordInput = document.getElementById("word");
    if (wordInput) {
        wordInput.placeholder = getLangPlaceholder(savedLang);
        if (savedLang === "ar") {
            wordInput.dir = "rtl";
        } else {
            wordInput.dir = "ltr";
        }
    }
}

// Event Listeners initialization
function initEventListeners() {
    const wordInput = document.getElementById("word");
    const clearBtn = document.getElementById("clear-btn");

    // Input changes
    wordInput.addEventListener("input", () => {
        if (wordInput.value.trim().length > 0) {
            clearBtn.classList.add("visible");
        } else {
            clearBtn.classList.remove("visible");
        }
    });

    // Press Enter to search
    wordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            getMeaning();
        }
    });

    // Custom select dropdown event handlers
    const selectTrigger = document.getElementById("theme-select-trigger");
    const selectContainer = document.getElementById("theme-select-container");
    const selectOptions = document.querySelectorAll("#theme-select-options li");
    const selectLabel = document.getElementById("theme-select-label");

    selectTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = selectContainer.classList.contains("open");
        if (isOpen) {
            selectContainer.classList.remove("open");
            selectTrigger.setAttribute("aria-expanded", "false");
        } else {
            selectContainer.classList.add("open");
            selectTrigger.setAttribute("aria-expanded", "true");
        }
    });

    selectOptions.forEach(option => {
        option.addEventListener("click", (e) => {
            e.stopPropagation();
            const val = option.getAttribute("data-value");

            selectOptions.forEach(li => li.classList.remove("active"));
            option.classList.add("active");

            selectLabel.textContent = option.textContent;
            selectContainer.classList.remove("open");
            selectTrigger.setAttribute("aria-expanded", "false");

            applyTheme(val);
        });
    });

    document.addEventListener("click", () => {
        if (selectContainer) {
            selectContainer.classList.remove("open");
            selectTrigger.setAttribute("aria-expanded", "false");
        }
    });
}

function getThemeName(themeId) {
    const themes = {
        'dark': 'Obsidian Dark',
        'cyber': 'Midnight Cyber',
        'light': 'Light Glass',
        'sepia': 'Sepia Paper'
    };
    return themes[themeId] || themeId;
}

// Clear Search Input
function clearSearch() {
    const wordInput = document.getElementById("word");
    wordInput.value = "";
    wordInput.focus();
    document.getElementById("clear-btn").classList.remove("visible");
}

// Toast Notification System
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Select Icon based on Type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else {
        iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add("toast-out");
        toast.addEventListener("animationend", () => {
            toast.remove();
        });
    }, 3000);
}

// Fetch Word Meaning
async function getMeaning(wordParam = null) {
    const wordInput = document.getElementById("word");
    const searchWord = (wordParam || wordInput.value).trim().toLowerCase();

    if (!searchWord) {
        showToast("Please enter a word to search.", "error");
        return;
    }

    // Smooth Scroll to Top on Search
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update input field if search was triggered externally
    if (wordParam) {
        wordInput.value = wordParam;
        document.getElementById("clear-btn").classList.add("visible");
    }

    renderLoading();

    // Offline checking hook
    if (!navigator.onLine) {
        const cachedData = getWordFromCache(searchWord);
        if (cachedData) {
            addToHistory(searchWord);
            renderResult(cachedData);
            showToast(`Loaded "${searchWord}" from offline cache.`, "success");
        } else {
            renderOfflineNotFound(searchWord);
        }
        return;
    }

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${activeLanguage}/${searchWord}`);

        if (!response.ok) {
            if (response.status === 404) {
                if (activeLanguage === 'en') {
                    handleWordNotFound(searchWord);
                } else {
                    renderNotFound(searchWord);
                }
            } else {
                throw new Error("API Network issue");
            }
            return;
        }

        const data = await response.json();

        // Add to Search History
        addToHistory(searchWord);

        // Save definitions to offline LocalStorage cache
        saveWordToCache(searchWord, data[0]);

        // Render results
        renderResult(data[0]);

        // Asynchronously fetch related word recommendations (English only)
        if (activeLanguage === 'en') {
            fetchRelatedWords(searchWord);
        }

    } catch (error) {
        console.error(error);
        renderError();
    }
}

// Loading Spinner / Skeleton Render
function renderLoading() {
    document.getElementById("result").innerHTML = `
        <div class="loader-spinner"></div>
        <div class="skeleton-wrapper">
            <div class="skeleton-title"></div>
            <div class="skeleton-meta"></div>
            <div class="skeleton-body"></div>
        </div>
    `;
}

// Render Results UI
function renderResult(wordData) {
    const word = wordData.word;
    const phonetics = wordData.phonetics || [];

    // Find audio file in phonetics list
    let audioUrl = "";
    const phoneticWithAudio = phonetics.find(p => p.audio && p.audio.trim().length > 0);
    if (phoneticWithAudio) {
        audioUrl = phoneticWithAudio.audio;
    }

    // Find phonetic text
    let phoneticText = wordData.phonetic || "";
    if (!phoneticText && phonetics.length > 0) {
        const phoneticWithText = phonetics.find(p => p.text && p.text.trim().length > 0);
        if (phoneticWithText) {
            phoneticText = phoneticWithText.text;
        }
    }

    // Check if word is bookmarked
    const isBookmarked = bookmarkedWords.includes(word);

    // Fetch custom note
    const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
    const noteText = notesObj[word.toLowerCase()] || "";

    const speechRate = localStorage.getItem("lexicon_speech_rate") || "1.0";

    let htmlContent = `
        <div class="word-header-container">
            <div class="word-info">
                <h2>${word}</h2>
                <div class="phonetic-wrapper">
                    ${phoneticText ? `<span class="phonetic-text">${phoneticText}</span>` : ''}
                    <button class="audio-btn" onclick="playPronunciation('${word}', '${audioUrl}')" title="Listen Pronunciation" aria-label="Listen Pronunciation">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                        </svg>
                    </button>
                    <div class="speech-speed-wrapper" title="Pronunciation Speed">
                        <span>Speed:</span>
                        <select class="speech-speed-select" onchange="changeSpeechRate(this.value)" aria-label="Playback speed select">
                            <option value="0.5" ${speechRate === "0.5" ? "selected" : ""}>0.5x</option>
                            <option value="0.75" ${speechRate === "0.75" ? "selected" : ""}>0.75x</option>
                            <option value="1.0" ${speechRate === "1.0" ? "selected" : ""}>1.0x</option>
                            <option value="1.25" ${speechRate === "1.25" ? "selected" : ""}>1.25x</option>
                            <option value="1.5" ${speechRate === "1.5" ? "selected" : ""}>1.5x</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="word-actions">
                <!-- Copy definition to clipboard button -->
                <button class="action-btn" onclick="copyDefinitionToClipboard('${word}')" title="Copy meanings to clipboard" aria-label="Copy meanings">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                    </svg>
                </button>
                
                <!-- Bookmark word button -->
                <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" id="bookmark-toggle-btn" onclick="toggleBookmark('${word}')" title="${isBookmarked ? 'Remove Bookmark' : 'Bookmark Word'}" aria-label="Bookmark word">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Custom study notes block -->
        <div class="word-note-container" id="word-note-container">
            ${renderNoteBlock(word, noteText)}
        </div>
    `;

    // Process meanings grouped by part of speech
    wordData.meanings.forEach((meaning) => {
        const partOfSpeech = meaning.partOfSpeech;
        const definitions = meaning.definitions || [];
        const synonyms = meaning.synonyms || [];
        const antonyms = meaning.antonyms || [];

        htmlContent += `
            <div class="pos-container">
                <div class="pos-header">
                    <span class="pos-title">${partOfSpeech}</span>
                    <span class="pos-line"></span>
                </div>
                <ul class="definitions-list">
        `;

        // Render first 3 definitions per part of speech to keep it clean
        definitions.slice(0, 3).forEach((def) => {
            htmlContent += `
                <li class="definition-item">
                    <p class="definition-text">${def.definition}</p>
                    ${def.example ? `<p class="example-text">"${def.example}"</p>` : ''}
                </li>
            `;
        });

        htmlContent += `</ul>`;

        // Synonyms and antonyms row
        if (synonyms.length > 0 || antonyms.length > 0) {
            htmlContent += `<div class="thesaurus-container">`;

            if (synonyms.length > 0) {
                htmlContent += `
                    <div class="thesaurus-row">
                        <span class="thesaurus-label">Synonyms:</span>
                        <div class="tags-list">
                `;
                synonyms.slice(0, 5).forEach((syn) => {
                    htmlContent += `<span class="tag" onclick="getMeaning('${syn}')">${syn}</span>`;
                });
                htmlContent += `</div></div>`;
            }

            if (antonyms.length > 0) {
                htmlContent += `
                    <div class="thesaurus-row">
                        <span class="thesaurus-label">Antonyms:</span>
                        <div class="tags-list">
                `;
                antonyms.slice(0, 5).forEach((ant) => {
                    htmlContent += `<span class="tag" onclick="getMeaning('${ant}')">${ant}</span>`;
                });
                htmlContent += `</div></div>`;
            }

            htmlContent += `</div>`;
        }

        htmlContent += `</div>`;
    });

    document.getElementById("result").innerHTML = htmlContent;
}

// Render "Word Not Found" Screen
function renderNotFound(word) {
    document.getElementById("result").innerHTML = `
        <div class="error-box">
            <!-- Alert Circle SVG -->
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <h3>Word Not Found</h3>
            <p>We couldn't find definitions for <strong>"${word}"</strong>. Double-check the spelling or try searching for another word.</p>
        </div>
    `;
    showToast(`Word "${word}" not found.`, "error");
}

// Render General Fetch Error Screen
function renderError() {
    document.getElementById("result").innerHTML = `
        <div class="error-box">
            <!-- Offline / Connection Issue SVG -->
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 5 5 0 011.414-3.536m0 0L5.636 5.636m0 0L3 3m5.636 2.636L10 8"></path>
            </svg>
            <h3>Connection Error</h3>
            <p>We're having trouble reaching the dictionary servers. Please check your internet connection and try again.</p>
        </div>
    `;
    showToast("Error retrieving data. Please try again later.", "error");
}

// Voice/Audio Pronunciation Player
function playPronunciation(word, audioUrl) {
    const audioBtn = document.querySelector(".audio-btn");

    // Check if we have standard API pronunciation audio
    if (audioUrl) {
        // If there's an active running audio, stop it
        if (activeAudio) {
            activeAudio.pause();
            activeAudio = null;
        }

        try {
            audioBtn.classList.add("playing");
            activeAudio = new Audio(audioUrl);
            activeAudio.playbackRate = parseFloat(localStorage.getItem("lexicon_speech_rate") || "1.0");
            activeAudio.play();

            activeAudio.onended = () => {
                audioBtn.classList.remove("playing");
            };
            activeAudio.onerror = () => {
                audioBtn.classList.remove("playing");
                useTextToSpeech(word);
            };
        } catch (e) {
            audioBtn.classList.remove("playing");
            useTextToSpeech(word);
        }
    } else {
        // Fallback to Web Speech Synthesis API
        useTextToSpeech(word);
    }
}

// Fallback Speech Synthesis
function useTextToSpeech(word) {
    if ('speechSynthesis' in window) {
        const audioBtn = document.querySelector(".audio-btn");
        audioBtn.classList.add("playing");

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = getVoiceLangCode(activeLanguage);
        utterance.rate = parseFloat(localStorage.getItem("lexicon_speech_rate") || "1.0");

        utterance.onend = () => {
            audioBtn.classList.remove("playing");
        };
        utterance.onerror = () => {
            audioBtn.classList.remove("playing");
            showToast("Pronunciation audio unavailable.", "error");
        };

        window.speechSynthesis.speak(utterance);
    } else {
        showToast("Your browser doesn't support text-to-speech.", "error");
    }
}

// History Handling
function addToHistory(word) {
    // Filter duplicates
    searchHistory = searchHistory.filter(w => w !== word);
    // Add to front
    searchHistory.unshift(word);
    // Limit to 8 elements
    if (searchHistory.length > 8) {
        searchHistory.pop();
    }

    localStorage.setItem("lexicon_history", JSON.stringify(searchHistory));
    renderHistory();
}

function renderHistory() {
    const listContainer = document.getElementById("history-list");
    if (searchHistory.length === 0) {
        listContainer.innerHTML = '<li class="empty-state">No search history.</li>';
        return;
    }

    const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
    const wordCache = JSON.parse(localStorage.getItem("lexicon_word_cache") || "{}");

    // Dynamic search filtering
    const filtered = searchHistory.filter(word => {
        if (!historyFilterQuery) return true;
        if (word.toLowerCase().includes(historyFilterQuery)) return true;

        const note = (notesObj[word.toLowerCase()] || "").toLowerCase();
        if (note.includes(historyFilterQuery)) return true;

        const cacheKey = Object.keys(wordCache).find(k => k.endsWith(`:${word.toLowerCase()}`) || k === word.toLowerCase());
        if (cacheKey) {
            const cachedData = wordCache[cacheKey];
            const meanings = cachedData.meanings || [];
            for (const meaning of meanings) {
                if (meaning.partOfSpeech.toLowerCase().includes(historyFilterQuery)) return true;
                const definitions = meaning.definitions || [];
                for (const def of definitions) {
                    if (def.definition.toLowerCase().includes(historyFilterQuery)) return true;
                    if (def.example && def.example.toLowerCase().includes(historyFilterQuery)) return true;
                }
                const synonyms = meaning.synonyms || [];
                for (const syn of synonyms) {
                    if (syn.toLowerCase().includes(historyFilterQuery)) return true;
                }
                const antonyms = meaning.antonyms || [];
                for (const ant of antonyms) {
                    if (ant.toLowerCase().includes(historyFilterQuery)) return true;
                }
            }
        }
        return false;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<li class="empty-state">No matching history.</li>';
        return;
    }

    listContainer.innerHTML = filtered.map(word => {
        const hasNote = notesObj[word.toLowerCase()];
        const noteIndicator = hasNote ? `<span class="note-indicator" title="Contains custom note">//</span>` : "";
        return `
            <li class="sidebar-item" onclick="getMeaning('${word}')">
                <span class="sidebar-item-text">${word}${noteIndicator}</span>
                <button class="sidebar-item-action" onclick="deleteHistoryItem(event, '${word}')" title="Delete from history" aria-label="Delete history item">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </li>
        `;
    }).join("");
}

function deleteHistoryItem(event, word) {
    event.stopPropagation(); // Stop parent click (which triggers search)
    searchHistory = searchHistory.filter(w => w !== word);
    localStorage.setItem("lexicon_history", JSON.stringify(searchHistory));
    renderHistory();
    showToast(`Removed "${word}" from history.`, "info");
}

function clearHistory() {
    if (searchHistory.length === 0) return;
    showCustomConfirm(
        "Clear Search History?",
        "This will permanently delete all your recent searches from your history. This action cannot be undone.",
        () => {
            searchHistory = [];
            localStorage.removeItem("lexicon_history");
            renderHistory();
            showToast("Search history cleared.", "success");
        }
    );
}

// Bookmarking Handling
function toggleBookmark(word) {
    const btn = document.getElementById("bookmark-toggle-btn");
    const isBookmarked = bookmarkedWords.includes(word);

    if (isBookmarked) {
        // Remove bookmark
        bookmarkedWords = bookmarkedWords.filter(w => w !== word);
        btn.classList.remove("bookmarked");
        btn.title = "Bookmark Word";
        showToast(`"${word}" removed from bookmarks.`, "info");
    } else {
        // Add bookmark
        bookmarkedWords.unshift(word);
        btn.classList.add("bookmarked");
        btn.title = "Remove Bookmark";
        showToast(`"${word}" saved to bookmarks.`, "success");
    }

    localStorage.setItem("lexicon_bookmarks", JSON.stringify(bookmarkedWords));
    renderBookmarks();
}

function renderBookmarks() {
    const listContainer = document.getElementById("bookmarks-list");
    if (bookmarkedWords.length === 0) {
        listContainer.innerHTML = '<li class="empty-state">No saved words yet.</li>';
        return;
    }

    const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
    const wordCache = JSON.parse(localStorage.getItem("lexicon_word_cache") || "{}");

    // Dynamic search filtering
    const filtered = bookmarkedWords.filter(word => {
        if (!bookmarksFilterQuery) return true;
        if (word.toLowerCase().includes(bookmarksFilterQuery)) return true;

        const note = (notesObj[word.toLowerCase()] || "").toLowerCase();
        if (note.includes(bookmarksFilterQuery)) return true;

        const cacheKey = Object.keys(wordCache).find(k => k.endsWith(`:${word.toLowerCase()}`) || k === word.toLowerCase());
        if (cacheKey) {
            const cachedData = wordCache[cacheKey];
            const meanings = cachedData.meanings || [];
            for (const meaning of meanings) {
                if (meaning.partOfSpeech.toLowerCase().includes(bookmarksFilterQuery)) return true;
                const definitions = meaning.definitions || [];
                for (const def of definitions) {
                    if (def.definition.toLowerCase().includes(bookmarksFilterQuery)) return true;
                    if (def.example && def.example.toLowerCase().includes(bookmarksFilterQuery)) return true;
                }
                const synonyms = meaning.synonyms || [];
                for (const syn of synonyms) {
                    if (syn.toLowerCase().includes(bookmarksFilterQuery)) return true;
                }
                const antonyms = meaning.antonyms || [];
                for (const ant of antonyms) {
                    if (ant.toLowerCase().includes(bookmarksFilterQuery)) return true;
                }
            }
        }
        return false;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<li class="empty-state">No matching saved words.</li>';
        return;
    }

    listContainer.innerHTML = filtered.map(word => {
        const hasNote = notesObj[word.toLowerCase()];
        const noteIndicator = hasNote ? `<span class="note-indicator" title="Contains custom note">//</span>` : "";
        return `
            <li class="sidebar-item" onclick="getMeaning('${word}')">
                <span class="sidebar-item-text">${word}${noteIndicator}</span>
                <button class="sidebar-item-action" onclick="deleteBookmarkItem(event, '${word}')" title="Remove bookmark" aria-label="Remove bookmark">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </li>
        `;
    }).join("");
}

function deleteBookmarkItem(event, word) {
    event.stopPropagation(); // Stop parent click (search)
    bookmarkedWords = bookmarkedWords.filter(w => w !== word);
    localStorage.setItem("lexicon_bookmarks", JSON.stringify(bookmarkedWords));
    renderBookmarks();

    // Check if the current visible word is the one deleted, and toggle button status if it is
    const activeHeading = document.querySelector(".word-info h2");
    if (activeHeading && activeHeading.textContent.toLowerCase() === word.toLowerCase()) {
        const toggleBtn = document.getElementById("bookmark-toggle-btn");
        if (toggleBtn) {
            toggleBtn.classList.remove("bookmarked");
            toggleBtn.title = "Bookmark Word";
        }
    }
    showToast(`Removed "${word}" from bookmarks.`, "info");
}

// Copy Definitions to Clipboard
function copyDefinitionToClipboard(word) {
    const definitions = Array.from(document.querySelectorAll(".definition-text"))
        .map((el, i) => `${i + 1}. ${el.textContent}`)
        .join("\n");

    if (!definitions) {
        showToast("No definition content to copy.", "error");
        return;
    }

    const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
    const noteText = notesObj[word.toLowerCase()] || "";
    const noteSection = noteText ? `\n// Note: ${noteText}\n` : "";

    const textToCopy = `Word: ${word}\n${noteSection}\nDefinitions:\n${definitions}\n\nGenerated via Corsivo Dictionary`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Definitions for "${word}" copied to clipboard!`, "success");
    }).catch(() => {
        showToast("Failed to copy text. Please select and copy manually.", "error");
    });
}

// Word of the Day Picker (Seed-based daily selection)
function loadWordOfTheDay() {
    const today = new Date();
    // Use date elements to generate a unique index for the day
    const daySeed = today.getFullYear() + today.getMonth() + today.getDate();
    const index = daySeed % WORD_OF_THE_DAY_LIST.length;
    const wordOfTheDay = WORD_OF_THE_DAY_LIST[index];

    showToast("Displaying today's curated Word of the Day!", "info");
    getMeaning(wordOfTheDay);
}

// Search Random Word Generator
function searchRandomWord() {
    const index = Math.floor(Math.random() * RANDOM_WORDS.length);
    const randomWord = RANDOM_WORDS[index];

    showToast("Searching for a random word...", "info");
    getMeaning(randomWord);
}

// --- NEW COMPONENT & UTILITY LOGIC (PHASE 2) ---

let modalConfirmCallback = null;

// Initialize custom modal event handlers
function initModalListeners() {
    const modal = document.getElementById("custom-modal");
    const cancelBtn = document.getElementById("modal-cancel-btn");
    const confirmBtn = document.getElementById("modal-confirm-btn");

    cancelBtn.addEventListener("click", () => {
        closeCustomModal();
    });

    confirmBtn.addEventListener("click", () => {
        if (modalConfirmCallback) {
            modalConfirmCallback();
        }
        closeCustomModal();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeCustomModal();
        }
    });
}

function showCustomConfirm(title, message, onConfirm) {
    const modal = document.getElementById("custom-modal");
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").textContent = message;
    modalConfirmCallback = onConfirm;
    modal.classList.add("open");
}

function closeCustomModal() {
    const modal = document.getElementById("custom-modal");
    modal.classList.remove("open");
    modalConfirmCallback = null;
}

function applyTheme(theme) {
    const themeAction = () => {
        document.body.className = theme;
        localStorage.setItem("lexicon_theme", theme);
    };

    if (document.startViewTransition) {
        document.startViewTransition(themeAction);
    } else {
        themeAction();
    }
    showToast(`Theme changed to ${getThemeName(theme)}!`, "success");
}

// Typo spell-checking and suggestion generator
async function handleWordNotFound(word) {
    try {
        const response = await fetch(`https://api.datamuse.com/words?sl=${word}&max=5`);
        if (!response.ok) {
            renderNotFound(word);
            return;
        }

        const suggestions = await response.json();

        if (suggestions.length === 0) {
            renderNotFound(word);
            return;
        }

        const bestMatch = suggestions[0].word;
        const distance = getLevenshteinDistance(word, bestMatch);

        // Auto-correct spelling if difference is minor
        if (distance <= 2) {
            showToast(`Auto-corrected to "${bestMatch}"`, "info");
            getMeaning(bestMatch);
        } else {
            renderNotFoundWithSuggestions(word, suggestions.map(s => s.word));
        }
    } catch (err) {
        console.error(err);
        renderNotFound(word);
    }
}

// Levenshtein distance string similarity metric
function getLevenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Substitution
                    matrix[i][j - 1] + 1,     // Insertion
                    matrix[i - 1][j] + 1      // Deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Render word not found message alongside spell suggestions
function renderNotFoundWithSuggestions(word, suggestionsList) {
    const suggestionPills = suggestionsList
        .filter(s => s.toLowerCase() !== word.toLowerCase())
        .slice(0, 4)
        .map(s => `<span class="suggestion-tag" onclick="getMeaning('${s}')">${s}</span>`)
        .join("");

    if (!suggestionPills) {
        renderNotFound(word);
        return;
    }

    document.getElementById("result").innerHTML = `
        <div class="error-box">
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <h3>Word Not Found</h3>
            <p>We couldn't find definitions for <strong>"${word}"</strong>.</p>
            
            <div class="typo-suggestions-container">
                <span>Did you mean:</span>
                <div class="suggestions-list">
                    ${suggestionPills}
                </div>
            </div>
        </div>
    `;
    showToast(`Word "${word}" not found.`, "error");
}

// Fetch meaning-like terms for recommendations
async function fetchRelatedWords(word) {
    try {
        const response = await fetch(`https://api.datamuse.com/words?ml=${word}&max=6`);
        if (!response.ok) return;

        const related = await response.json();
        if (related.length === 0) return;

        renderRelatedWords(related.map(r => r.word), word);
    } catch (err) {
        console.error(err);
    }
}

// Render the follow up recommendations section
function renderRelatedWords(wordsList, searchWord) {
    const filteredList = wordsList
        .filter(w => w.toLowerCase() !== searchWord.toLowerCase() && !w.includes(" ") && !w.includes("-"))
        .slice(0, 5);

    if (filteredList.length === 0) return;

    const relatedPills = filteredList.map(w => `
        <span class="related-tag" onclick="getMeaning('${w}')">${w}</span>
    `).join("");

    const relatedContainer = document.createElement("div");
    relatedContainer.className = "related-words-container";
    relatedContainer.innerHTML = `
        <div class="pos-header">
            <span class="pos-title">Explore Related Words</span>
            <span class="pos-line"></span>
        </div>
        <div class="related-tags-list">
            ${relatedPills}
        </div>
    `;

    document.getElementById("result").appendChild(relatedContainer);
}

// --- OFFLINE MODE CACHING & INFO NAVIGATION TAB LOGIC (PHASE 4) ---

let isOfflineWidgetDismissed = false;

// Init connection listeners
function initOfflineListeners() {
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    // Check initial state
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const widgetContainer = document.getElementById("connection-widget");
    if (!widgetContainer) return;

    if (navigator.onLine) {
        // If we were offline and now online, display the "back online" card!
        const wasOffline = widgetContainer.querySelector(".connection-card.offline") !== null;
        if (wasOffline) {
            widgetContainer.innerHTML = `
                <div class="connection-card online" id="connection-card">
                    <div class="connection-icon">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5.314 12.814a9 9 0 0113.372 0M2.122 9.622a13.5 13.5 0 0119.756 0" />
                        </svg>
                    </div>
                    <div class="connection-info">
                        <div class="connection-header">
                            <h4>Back Online</h4>
                            <span class="connection-badge online">Online</span>
                        </div>
                        <p>Connection restored. Live dictionary searches active.</p>
                    </div>
                </div>
            `;
            const card = document.getElementById("connection-card");
            setTimeout(() => {
                if (card) card.classList.add("visible");
            }, 50);

            showToast("Connection restored! You are online.", "success");

            // Auto hide online indicator card after 4 seconds
            setTimeout(() => {
                const activeCard = document.getElementById("connection-card");
                if (activeCard && activeCard.classList.contains("online")) {
                    activeCard.classList.remove("visible");
                    setTimeout(() => {
                        widgetContainer.innerHTML = "";
                    }, 500);
                }
            }, 4000);
        } else {
            widgetContainer.innerHTML = "";
        }
        isOfflineWidgetDismissed = false;
    } else {
        if (isOfflineWidgetDismissed) return;

        widgetContainer.innerHTML = `
            <div class="connection-card offline" id="connection-card">
                <div class="connection-icon">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.5M5 12.5a10.94 10.94 0 015.83-2.84M8.53 16A4.99 4.99 0 0112 15M12 15a4.99 4.99 0 012.95.96M10.76 18.24a2 2 0 112.48 0M1.67 8a17.92 17.92 0 018.66-2.91M19.1 5.3a17.93 17.93 0 013.23 2.7" />
                    </svg>
                </div>
                <div class="connection-info">
                    <div class="connection-header">
                        <h4>Connection Offline</h4>
                        <span class="connection-badge offline">Offline</span>
                    </div>
                    <p>Running in local-cache mode. You can still search for cached words.</p>
                </div>
                <button class="connection-close" onclick="dismissOfflineWidget()" aria-label="Dismiss notification">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        const card = document.getElementById("connection-card");
        setTimeout(() => {
            if (card) card.classList.add("visible");
        }, 50);

        showToast("You are offline. Running in local-cache mode.", "error");
    }
}

function dismissOfflineWidget() {
    const card = document.getElementById("connection-card");
    if (card) {
        card.classList.remove("visible");
        isOfflineWidgetDismissed = true;
        setTimeout(() => {
            const widgetContainer = document.getElementById("connection-widget");
            if (widgetContainer) widgetContainer.innerHTML = "";
        }, 500);
    }
}

// Cache retrieval logic
function getWordFromCache(word) {
    const cachedData = localStorage.getItem("lexicon_word_cache");
    if (!cachedData) return null;

    const cache = JSON.parse(cachedData);
    const cacheKey = `${activeLanguage}:${word.toLowerCase()}`;
    return cache[cacheKey] || null;
}

// Cache saving logic
function saveWordToCache(word, data) {
    let cache = {};
    const cachedData = localStorage.getItem("lexicon_word_cache");
    if (cachedData) {
        cache = JSON.parse(cachedData);
    }

    const cacheKey = `${activeLanguage}:${word.toLowerCase()}`;
    cache[cacheKey] = data;

    // Maintain maximum cache ceiling threshold of 250 words to preserve local storage bounds
    // Keep bookmarked words permanently cached by excluding them from pruning
    const keys = Object.keys(cache);
    if (keys.length > 250) {
        const pruneKey = keys.find(k => {
            const parts = k.split(':');
            const cachedWord = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
            return !bookmarkedWords.map(w => w.toLowerCase()).includes(cachedWord.toLowerCase());
        });
        if (pruneKey) {
            delete cache[pruneKey];
        } else {
            delete cache[keys[0]];
        }
    }

    localStorage.setItem("lexicon_word_cache", JSON.stringify(cache));
}

// Render Offline Not Found Template
function renderOfflineNotFound(word) {
    document.getElementById("result").innerHTML = `
        <div class="error-box">
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 5 5 0 011.414-3.536m0 0L5.636 5.636m0 0L3 3m5.636 2.636L10 8"></path>
            </svg>
            <h3>Word Not Cached</h3>
            <p>You are currently offline, and definitions for <strong>"${word}"</strong> are not saved in your local search cache. Please check your network connection.</p>
        </div>
    `;
    showToast(`"${word}" is not cached offline.`, "error");
}

// Custom Glassmorphic Tabs Overlay Modal controls
function openInfoModal(defaultTabId) {
    const modal = document.getElementById("info-modal");
    if (!modal) return;

    modal.classList.add("open");
    switchInfoTab(defaultTabId);
}

function closeInfoModal() {
    const modal = document.getElementById("info-modal");
    if (!modal) return;

    modal.classList.remove("open");
}

function switchInfoTab(tabId) {
    // Select tabs and content divs
    const tabButtons = document.querySelectorAll(".info-tabs .tab-btn");
    const contents = document.querySelectorAll(".info-content-wrapper .tab-content");

    // Toggle active state
    tabButtons.forEach(btn => {
        if (btn.getAttribute("data-tab") === tabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    contents.forEach(content => {
        if (content.id === `tab-content-${tabId}`) {
            content.classList.add("active");
        } else {
            content.classList.remove("active");
        }
    });
}

// --- NEW COMPONENT INTEGRATIONS (CONTEXT MENU, NOTES SYSTEM, BACKUP & RESTORE) ---

// Inject Context Menu HTML dynamically
function createContextMenuHTML() {
    const menuDiv = document.createElement("div");
    menuDiv.className = "custom-context-menu";
    menuDiv.id = "custom-context-menu";
    menuDiv.innerHTML = `
        <ul class="context-menu-list">
            <li class="context-menu-item" id="ctx-search-selection" style="display: none;">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <span>Search "<span id="ctx-selected-text-preview"></span>"</span>
            </li>
            <li class="context-menu-item" id="ctx-pronounce">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                <span>Pronounce Word</span>
            </li>
            <li class="context-menu-item" id="ctx-bookmark">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                <span id="ctx-bookmark-label">Bookmark Word</span>
            </li>
            <li class="context-menu-item" id="ctx-note">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                <span id="ctx-note-label">Add Note</span>
            </li>
            <li class="context-menu-item" id="ctx-random">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v16H4V4z"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
                <span>Random Word</span>
            </li>
            <li class="context-menu-divider"></li>
            <li class="context-menu-header">Change Theme</li>
            <li class="context-menu-themes-row">
                <button class="ctx-theme-btn" data-theme="dark" title="Obsidian Dark"><span class="color-dot obsidian"></span></button>
                <button class="ctx-theme-btn" data-theme="cyber" title="Midnight Cyber"><span class="color-dot cyber"></span></button>
                <button class="ctx-theme-btn" data-theme="light" title="Light Glass"><span class="color-dot light"></span></button>
                <button class="ctx-theme-btn" data-theme="sepia" title="Sepia Paper"><span class="color-dot sepia"></span></button>
            </li>
            <li class="context-menu-divider"></li>
            <li class="context-menu-item" id="ctx-backup">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Backup & Restore</span>
            </li>
        </ul>
    `;
    // Mount to documentElement to resolve position: fixed body transform offsets
    document.documentElement.appendChild(menuDiv);
}

// Touch gesture handler (mobile 500ms long-press hold to context menu)
let touchTimer = null;
let lastTouchPos = { x: 0, y: 0 };
const HOLD_DURATION = 500;

function initTouchHoldListeners() {
    document.addEventListener("touchstart", (e) => {
        // Only trigger on non-input nodes
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.closest("button") || e.target.closest("a") || e.target.closest("li.sidebar-item") || e.target.closest(".tag")) {
            return;
        }

        const touch = e.touches[0];
        lastTouchPos = { x: touch.clientX, y: touch.clientY };

        if (touchTimer) clearTimeout(touchTimer);

        touchTimer = setTimeout(() => {
            triggerContextMenu(e, lastTouchPos.x, lastTouchPos.y);
        }, HOLD_DURATION);
    }, { passive: false });

    document.addEventListener("touchmove", (e) => {
        const touch = e.touches[0];
        const moveDistance = Math.hypot(touch.clientX - lastTouchPos.x, touch.clientY - lastTouchPos.y);

        if (moveDistance > 8 && touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }, { passive: true });

    document.addEventListener("touchend", () => {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    });
}

// Context Menu triggering logic
function triggerContextMenu(e, clientX, clientY) {
    e.preventDefault();

    const menu = document.getElementById("custom-context-menu");
    if (!menu) return;

    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;

    // Selection Search check
    const selectedText = window.getSelection().toString().trim();
    const selectionSearchItem = document.getElementById("ctx-search-selection");
    const selectionPreviewSpan = document.getElementById("ctx-selected-text-preview");

    if (selectedText.length > 0 && selectedText.length < 25) {
        selectionSearchItem.style.display = "flex";
        selectionPreviewSpan.textContent = selectedText.length > 12 ? selectedText.slice(0, 10) + '...' : selectedText;
        selectionSearchItem.onclick = () => {
            getMeaning(selectedText);
            closeContextMenu();
        };
    } else {
        selectionSearchItem.style.display = "none";
        selectionSearchItem.onclick = null;
    }

    // Active Word checks
    const activeWordEl = document.querySelector(".word-info h2");
    const activeWord = activeWordEl ? activeWordEl.textContent.trim() : "";

    const pronounceItem = document.getElementById("ctx-pronounce");
    const bookmarkItem = document.getElementById("ctx-bookmark");
    const noteItem = document.getElementById("ctx-note");

    if (activeWord) {
        pronounceItem.style.opacity = "1";
        pronounceItem.style.pointerEvents = "auto";
        pronounceItem.onclick = () => {
            const playBtn = document.querySelector(".audio-btn");
            if (playBtn) playBtn.click();
            closeContextMenu();
        };

        const isBookmarked = bookmarkedWords.map(w => w.toLowerCase()).includes(activeWord.toLowerCase());
        document.getElementById("ctx-bookmark-label").textContent = isBookmarked ? 'Remove Bookmark' : 'Bookmark Word';
        bookmarkItem.style.opacity = "1";
        bookmarkItem.style.pointerEvents = "auto";
        bookmarkItem.onclick = () => {
            toggleBookmark(activeWord);
            closeContextMenu();
        };

        const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
        const hasNote = notesObj[activeWord.toLowerCase()];
        document.getElementById("ctx-note-label").textContent = hasNote ? 'Edit Custom Note' : 'Add Custom Note';
        noteItem.style.opacity = "1";
        noteItem.style.pointerEvents = "auto";
        noteItem.onclick = () => {
            triggerNoteEditor(activeWord);
            closeContextMenu();
        };
    } else {
        pronounceItem.style.opacity = "0.4";
        pronounceItem.style.pointerEvents = "none";
        pronounceItem.onclick = null;

        bookmarkItem.style.opacity = "0.4";
        bookmarkItem.style.pointerEvents = "none";
        bookmarkItem.onclick = null;

        noteItem.style.opacity = "0.4";
        noteItem.style.pointerEvents = "none";
        noteItem.onclick = null;
    }

    // Wire theme switchers
    const themeButtons = menu.querySelectorAll(".ctx-theme-btn");
    themeButtons.forEach(btn => {
        btn.onclick = (event) => {
            event.stopPropagation();
            const selectedTheme = btn.getAttribute("data-theme");

            const dropdownItem = document.querySelector(`.select-options li[data-value="${selectedTheme}"]`);
            if (dropdownItem) {
                document.querySelectorAll("#theme-select-options li").forEach(li => li.classList.remove("active"));
                dropdownItem.classList.add("active");
                document.getElementById("theme-select-label").textContent = dropdownItem.textContent;
            }

            applyTheme(selectedTheme);
            closeContextMenu();
        };
    });

    // Wire random click
    document.getElementById("ctx-random").onclick = () => {
        searchRandomWord();
        closeContextMenu();
    };

    // Wire backup triggers
    document.getElementById("ctx-backup").onclick = () => {
        openInfoModal("backup");
        closeContextMenu();
    };

    menu.classList.add("open");

    // Position bounding boxes adjustments
    const menuWidth = menu.offsetWidth || 190;
    const menuHeight = menu.offsetHeight || 260;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (clientX + menuWidth > windowWidth) {
        menu.style.left = `${clientX - menuWidth}px`;
    }
    if (clientY + menuHeight > windowHeight) {
        menu.style.top = `${clientY - menuHeight}px`;
    }
}

function closeContextMenu() {
    const menu = document.getElementById("custom-context-menu");
    if (menu) menu.classList.remove("open");
}

function initContextMenuListeners() {
    window.addEventListener("contextmenu", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
            return;
        }
        triggerContextMenu(e, e.clientX, e.clientY);
    });

    window.addEventListener("click", () => {
        closeContextMenu();
    });
}

// Note block rendering
function renderNoteBlock(word, noteText) {
    if (noteText) {
        return `
            <div class="note-comment-card">
                <span class="note-comment-syntax">// Note:</span>
                <span class="note-comment-text">${escapeHTML(noteText)}</span>
                <button class="note-action-btn edit-note" onclick="triggerNoteEditor('${word.replace(/'/g, "\\'")}')" title="Edit Note">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button class="note-action-btn delete-note" onclick="deleteNote('${word.replace(/'/g, "\\'")}')" title="Delete Note">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        `;
    } else {
        return `
            <button class="add-note-prompt-btn" onclick="triggerNoteEditor('${word.replace(/'/g, "\\'")}')">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Add Study Note
            </button>
        `;
    }
}

function triggerNoteEditor(word) {
    const container = document.getElementById("word-note-container");
    if (!container) return;

    const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
    const currentNote = notesObj[word.toLowerCase()] || "";

    container.innerHTML = `
        <div class="note-editor-card">
            <textarea id="note-textarea" placeholder="Add custom comments or code-like annotations for this word...">${currentNote}</textarea>
            <div class="note-editor-actions">
                <button class="note-editor-btn cancel" onclick="cancelNoteEdit('${word.replace(/'/g, "\\'")}')">Cancel</button>
                <button class="note-editor-btn save" onclick="saveNote('${word.replace(/'/g, "\\'")}')">Save Comment</button>
            </div>
        </div>
    `;

    const textarea = document.getElementById("note-textarea");
    if (textarea) {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    }
}

function cancelNoteEdit(word) {
    const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
    const currentNote = notesObj[word.toLowerCase()] || "";
    const container = document.getElementById("word-note-container");
    if (container) {
        container.innerHTML = renderNoteBlock(word, currentNote);
    }
}

function saveNote(word) {
    const textarea = document.getElementById("note-textarea");
    if (!textarea) return;

    const newNoteText = textarea.value.trim();
    const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");

    if (newNoteText) {
        notesObj[word.toLowerCase()] = newNoteText;
        showToast("Study note saved successfully!", "success");
    } else {
        delete notesObj[word.toLowerCase()];
        showToast("Note removed.", "info");
    }

    localStorage.setItem("lexicon_notes", JSON.stringify(notesObj));

    const container = document.getElementById("word-note-container");
    if (container) {
        container.innerHTML = renderNoteBlock(word, newNoteText);
    }

    renderHistory();
    renderBookmarks();
}

function deleteNote(word) {
    showCustomConfirm(
        "Delete Custom Note?",
        `Are you sure you want to permanently delete your personal note for the word "${word}"?`,
        () => {
            const notesObj = JSON.parse(localStorage.getItem("lexicon_notes") || "{}");
            delete notesObj[word.toLowerCase()];
            localStorage.setItem("lexicon_notes", JSON.stringify(notesObj));

            const container = document.getElementById("word-note-container");
            if (container) {
                container.innerHTML = renderNoteBlock(word, "");
            }

            renderHistory();
            renderBookmarks();
            showToast("Study note deleted.", "success");
        }
    );
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Backup & Restore Utilities
function exportData() {
    const data = {
        theme: localStorage.getItem("lexicon_theme") || "dark",
        history: searchHistory,
        bookmarks: bookmarkedWords,
        notes: JSON.parse(localStorage.getItem("lexicon_notes") || "{}"),
        cache: JSON.parse(localStorage.getItem("lexicon_word_cache") || "{}")
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `corsivo_dictionary_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast("Vocabulary database exported!", "success");
}

function triggerImport() {
    const fileInput = document.getElementById("import-file-input");
    if (fileInput) fileInput.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.theme) {
                applyTheme(data.theme);
                const activeOption = document.querySelector(`.select-options li[data-value="${data.theme}"]`);
                if (activeOption) {
                    document.querySelectorAll("#theme-select-options li").forEach(li => li.classList.remove("active"));
                    activeOption.classList.add("active");
                    document.getElementById("theme-select-label").textContent = activeOption.textContent;
                }
            }
            if (Array.isArray(data.history)) {
                searchHistory = data.history;
                localStorage.setItem("lexicon_history", JSON.stringify(searchHistory));
                renderHistory();
            }
            if (Array.isArray(data.bookmarks)) {
                bookmarkedWords = data.bookmarks;
                localStorage.setItem("lexicon_bookmarks", JSON.stringify(bookmarkedWords));
                renderBookmarks();
            }
            if (data.notes && typeof data.notes === "object") {
                localStorage.setItem("lexicon_notes", JSON.stringify(data.notes));
            }
            if (data.cache && typeof data.cache === "object") {
                localStorage.setItem("lexicon_word_cache", JSON.stringify(data.cache));
            }

            showToast("Database imported successfully!", "success");

            // Re-render current result if active
            const currentWordEl = document.querySelector(".word-info h2");
            if (currentWordEl) {
                getMeaning(currentWordEl.textContent);
            }

            closeInfoModal();
        } catch (err) {
            console.error(err);
            showToast("Failed to parse backup JSON. Invalid file.", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset
}

// --- ADVANCED HELPER UTILITIES (LANGUAGES, SPEECH, FILTERING, VOICES) ---

function initLangSelector() {
    const trigger = document.getElementById("lang-select-trigger");
    const container = document.getElementById("lang-select-container");
    const options = document.querySelectorAll("#lang-select-options li");
    const label = document.getElementById("lang-select-label");

    if (!trigger || !container) return;

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = container.classList.contains("open");
        if (isOpen) {
            container.classList.remove("open");
            trigger.setAttribute("aria-expanded", "false");
        } else {
            // Close other custom dropdown select elements if open
            const themeContainer = document.getElementById("theme-select-container");
            if (themeContainer) themeContainer.classList.remove("open");

            container.classList.add("open");
            trigger.setAttribute("aria-expanded", "true");
        }
    });

    options.forEach(option => {
        option.addEventListener("click", (e) => {
            e.stopPropagation();
            const val = option.getAttribute("data-value");

            options.forEach(li => li.classList.remove("active"));
            option.classList.add("active");

            const textContent = option.textContent.trim();
            const shortName = textContent.slice(0, 4) + val.toUpperCase().slice(0, 2);
            label.textContent = shortName;

            container.classList.remove("open");
            trigger.setAttribute("aria-expanded", "false");

            changeLanguage(val);
        });
    });

    document.addEventListener("click", () => {
        container.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
    });
}

function changeLanguage(langCode) {
    activeLanguage = langCode;
    localStorage.setItem("lexicon_active_language", langCode);

    const wordInput = document.getElementById("word");
    if (wordInput) {
        wordInput.placeholder = getLangPlaceholder(langCode);
        if (langCode === "ar") {
            wordInput.dir = "rtl";
        } else {
            wordInput.dir = "ltr";
        }
    }

    showToast(`Active language shifted to ${getLangName(langCode)}!`, "success");

    if (wordInput && wordInput.value.trim()) {
        getMeaning(wordInput.value.trim());
    }
}

function getLangPlaceholder(langCode) {
    const placeholders = {
        'en': 'Explore word meanings...',
        'es': 'Explorar significados de palabras...',
        'fr': 'Explorer les significations des mots...',
        'de': 'Wortbedeutungen erforschen...',
        'it': 'Esplora i significati delle parole...',
        'pt-br': 'Explorar significados de palavras...',
        'ru': 'Исследуйте значения слов...',
        'tr': 'Kelime anlamlarını keşfedin...',
        'ar': 'استكشف معاني الكلمات...'
    };
    return placeholders[langCode] || 'Explore word meanings...';
}

function getLangName(langCode) {
    const names = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt-br': 'Portuguese',
        'ru': 'Russian',
        'tr': 'Turkish',
        'ar': 'Arabic'
    };
    return names[langCode] || langCode;
}

// Live search sidebar filters
function filterBookmarks() {
    const filterInput = document.getElementById("bookmarks-search");
    if (filterInput) {
        bookmarksFilterQuery = filterInput.value.trim().toLowerCase();
        renderBookmarks();
    }
}

function filterHistory() {
    const filterInput = document.getElementById("history-search");
    if (filterInput) {
        historyFilterQuery = filterInput.value.trim().toLowerCase();
        renderHistory();
    }
}

// Voice search integration using webkitSpeechRecognition
let voiceRecognition = null;

function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Voice recognition is not supported in this browser.", "error");
        return;
    }

    const voiceBtn = document.getElementById("voice-search-btn");
    if (!voiceBtn) return;

    if (voiceBtn.classList.contains("listening")) {
        if (voiceRecognition) voiceRecognition.stop();
        return;
    }

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.lang = getVoiceLangCode(activeLanguage);
    voiceRecognition.interimResults = false;
    voiceRecognition.maxAlternatives = 1;

    voiceRecognition.onstart = () => {
        voiceBtn.classList.add("listening");
        showToast("Speech Recognition started... Speak now.", "info");
    };

    voiceRecognition.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        voiceBtn.classList.remove("listening");
        showToast(`Voice Search Error: ${e.error}`, "error");
    };

    voiceRecognition.onend = () => {
        voiceBtn.classList.remove("listening");
        voiceRecognition = null;
    };

    voiceRecognition.onresult = (e) => {
        const resultWord = e.results[0][0].transcript.trim().replace(/\./g, "");
        if (resultWord) {
            document.getElementById("word").value = resultWord;
            document.getElementById("clear-btn").classList.add("visible");
            showToast(`Recognized query: "${resultWord}"`, "success");
            getMeaning(resultWord);
        }
    };

    voiceRecognition.start();
}

function getVoiceLangCode(langCode) {
    const voiceLangs = {
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'pt-br': 'pt-BR',
        'ru': 'ru-RU',
        'tr': 'tr-TR',
        'ar': 'ar-SA'
    };
    return voiceLangs[langCode] || 'en-US';
}

function changeSpeechRate(rate) {
    localStorage.setItem("lexicon_speech_rate", rate);
    showToast(`Speech rate set to ${rate}x.`, "info");
}
