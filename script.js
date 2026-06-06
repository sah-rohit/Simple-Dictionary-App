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

// Initialize App on Load
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    initEventListeners();
    initModalListeners();
    renderHistory();
    renderBookmarks();
    
    // Check if there is an active search query in the URL or load Word of the Day implicitly
    const urlParams = new URLSearchParams(window.location.search);
    const queryWord = urlParams.get('word');
    if (queryWord) {
        document.getElementById("word").value = queryWord;
        getMeaning(queryWord);
    }
});

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

    // Update input field if search was triggered externally
    if (wordParam) {
        wordInput.value = wordParam;
        document.getElementById("clear-btn").classList.add("visible");
    }

    renderLoading();

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                handleWordNotFound(searchWord);
            } else {
                throw new Error("API Network issue");
            }
            return;
        }

        const data = await response.json();
        
        // Add to Search History
        addToHistory(searchWord);
        
        // Render results
        renderResult(data[0]);

        // Asynchronously fetch related word recommendations
        fetchRelatedWords(searchWord);

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
        utterance.lang = 'en-US';
        
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

    listContainer.innerHTML = searchHistory.map(word => `
        <li class="sidebar-item" onclick="getMeaning('${word}')">
            <span class="sidebar-item-text">${word}</span>
            <button class="sidebar-item-action" onclick="deleteHistoryItem(event, '${word}')" title="Delete from history" aria-label="Delete history item">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </li>
    `).join("");
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

    listContainer.innerHTML = bookmarkedWords.map(word => `
        <li class="sidebar-item" onclick="getMeaning('${word}')">
            <span class="sidebar-item-text">${word}</span>
            <button class="sidebar-item-action" onclick="deleteBookmarkItem(event, '${word}')" title="Remove bookmark" aria-label="Remove bookmark">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </li>
    `).join("");
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

    const textToCopy = `Word: ${word}\n\nDefinitions:\n${definitions}\n\nGenerated via Corsivo Dictionary`;

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
    document.body.className = theme;
    localStorage.setItem("lexicon_theme", theme);
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

        // Auto-correct spelling if difference is minor (e.g. within 2 character modifications)
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
