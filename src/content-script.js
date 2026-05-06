/**
 * Content Script Entry Point
 * Main entry point for the browser extension content script
 * Uses dynamic imports to load ES6 modules
 */

// Dynamic import with proper extension URL
async function loadScrapers() {
  try {
    const moduleUrl = browserAPI.runtime.getURL('src/scrapers/init.js');
    const module = await import(moduleUrl);
    module.initializeScrapers();
  } catch (error) {
    console.error('[AI-Chat-Exporter] Failed to load scrapers:', error);
  }
}

// Initialize scrapers when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadScrapers);
} else {
  // DOM already loaded
  loadScrapers();
}

const SELECTABLE_ATTR = 'data-ai-export-selectable';
const SELECTED_ATTR = 'data-ai-export-selected';
const TURN_INDEX_ATTR = 'data-ai-export-turn-index';
const ROLE_ATTR = 'data-ai-export-role';
const SELECTION_STYLE_ID = 'ai-export-selection-style';
const SELECTION_BANNER_ID = 'ai-export-selection-banner';

let selectionModeActive = false;
let selectedKeys = [];
let selectableNodes = [];

function normalizeRole(role) {
  if (role === 'assistant') return 'model';
  return role || 'unknown';
}

function getCurrentPlatform() {
  const href = window.location.href;
  if (href.includes('chatgpt.com') || href.includes('chat.openai.com')) return 'chatgpt';
  if (href.includes('claude.ai')) return 'claude';
  if (href.includes('gemini.google.com')) return 'gemini';
  return 'unknown';
}

function mapScrapeError(error) {
  const raw = error && error.message ? error.message : String(error || 'Unknown scrape error');
  const lower = raw.toLowerCase();
  const onGemini = window.location.href.includes('gemini.google.com');

  if (onGemini && (lower.includes('could not find chat app container') || lower.includes('container'))) {
    return "Gemini page detected, but no conversation was found yet. Open a Gemini conversation thread (or send a message), then try export again.";
  }

  return raw;
}

function ensureSelectionStyle() {
  if (document.getElementById(SELECTION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SELECTION_STYLE_ID;
  style.textContent = `
    [${SELECTABLE_ATTR}="1"] { outline: 2px dashed #38bdf8 !important; outline-offset: 2px; cursor: pointer !important; }
    [${SELECTED_ATTR}="1"] { outline: 3px solid #22c55e !important; box-shadow: 0 0 0 2px rgba(34,197,94,0.2) !important; }
    #${SELECTION_BANNER_ID} { position: fixed; top: 16px; right: 16px; z-index: 2147483647; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; font-size: 12px; line-height: 1.35; max-width: 320px; }
  `;
  document.documentElement.appendChild(style);
}

function ensureSelectionBanner() {
  let banner = document.getElementById(SELECTION_BANNER_ID);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = SELECTION_BANNER_ID;
    document.body.appendChild(banner);
  }
  const count = selectedKeys.length;
  banner.textContent = count === 0
    ? 'Export Selected mode: click a message to select it. Click selected message again to unselect.'
    : `Export Selected mode: ${count} selected. Click Export Selected in extension popup to export.`;
}

function removeSelectionBanner() {
  const banner = document.getElementById(SELECTION_BANNER_ID);
  if (banner) banner.remove();
}

function candidateKey(turnIndex, role) {
  return `${turnIndex}:${normalizeRole(role)}`;
}

function getSelectionCandidates() {
  const platform = getCurrentPlatform();

  if (platform === 'chatgpt') {
    const turns = Array.from(document.querySelectorAll('[data-turn]'));
    if (turns.length > 0) {
      return turns.map((turn, idx) => {
        const role = normalizeRole(turn.getAttribute('data-turn'));
        const testId = turn.getAttribute('data-testid') || '';
        const parsed = Number.parseInt(testId.split('-').pop(), 10);
        const turnIndex = Number.isFinite(parsed) ? parsed : idx;
        return { node: turn, role, turnIndex };
      });
    }

    // Fallback for ChatGPT UI variants that do not expose data-turn.
    const roleBlocks = Array.from(document.querySelectorAll('[data-message-author-role]'));
    return roleBlocks.map((block, idx) => {
      const role = normalizeRole(block.getAttribute('data-message-author-role'));
      const container = block.closest('article, section, div') || block;
      return { node: container, role, turnIndex: idx };
    });
  }

  if (platform === 'claude') {
    const groups = Array.from(document.querySelectorAll('div[data-test-render-count]'));
    if (groups.length > 0) {
      const rows = [];
      groups.forEach((group, idx) => {
        const user = group.querySelector('div[data-testid="user-message"]');
        const pasted = group.querySelector('div[data-testid="file-thumbnail"]');
        const model = group.querySelector('div.font-claude-response');
        if (user) rows.push({ node: user, role: 'user', turnIndex: idx });
        if (pasted) rows.push({ node: pasted, role: 'user', turnIndex: idx });
        if (model) rows.push({ node: model, role: 'model', turnIndex: idx });
      });
      return rows;
    }

    // Fallback for Claude layout variants.
    const fallbackRows = [];
    Array.from(document.querySelectorAll('div[data-testid="user-message"]')).forEach((node, idx) => {
      fallbackRows.push({ node, role: 'user', turnIndex: idx });
    });
    Array.from(document.querySelectorAll('div[data-testid="file-thumbnail"]')).forEach((node, idx) => {
      fallbackRows.push({ node, role: 'user', turnIndex: idx });
    });
    Array.from(document.querySelectorAll('div.font-claude-response')).forEach((node, idx) => {
      fallbackRows.push({ node, role: 'model', turnIndex: idx });
    });
    return fallbackRows;
  }

  if (platform === 'gemini') {
    const sets = Array.from(document.querySelectorAll('message-set'));
    if (sets.length > 0) {
      const rows = [];
      sets.forEach((set, idx) => {
        const user = set.querySelector('user-query');
        const model = set.querySelector('model-response');
        if (user) rows.push({ node: user, role: 'user', turnIndex: idx });
        if (model) rows.push({ node: model, role: 'model', turnIndex: idx });
      });
      return rows;
    }

    // Fallback for Gemini variants: pair global user/model sequences.
    const rows = [];
    Array.from(document.querySelectorAll('user-query')).forEach((node, idx) => {
      rows.push({ node, role: 'user', turnIndex: idx });
    });
    Array.from(document.querySelectorAll('model-response')).forEach((node, idx) => {
      rows.push({ node, role: 'model', turnIndex: idx });
    });
    return rows;
  }

  return [];
}

function handleSelectionClick(event) {
  const target = event.target && event.target.closest ? event.target.closest(`[${SELECTABLE_ATTR}="1"]`) : null;
  if (!target) return;

  event.preventDefault();
  event.stopPropagation();

  const turnIndex = target.getAttribute(TURN_INDEX_ATTR);
  const role = target.getAttribute(ROLE_ATTR);
  const key = candidateKey(turnIndex, role);
  const existingIdx = selectedKeys.indexOf(key);
  if (existingIdx >= 0) {
    selectedKeys.splice(existingIdx, 1);
    target.setAttribute(SELECTED_ATTR, '0');
  } else {
    selectedKeys.push(key);
    target.setAttribute(SELECTED_ATTR, '1');
  }
  ensureSelectionBanner();
}

function enterSelectionMode() {
  ensureSelectionStyle();
  const candidates = getSelectionCandidates();
  if (!candidates.length) {
    return { success: false, error: 'Could not find selectable messages on this page.' };
  }

  selectionModeActive = true;
  selectedKeys = [];
  selectableNodes = [];

  candidates.forEach(({ node, role, turnIndex }) => {
    if (!node || !node.setAttribute) return;
    node.setAttribute(SELECTABLE_ATTR, '1');
    node.setAttribute(SELECTED_ATTR, '0');
    node.setAttribute(TURN_INDEX_ATTR, String(turnIndex));
    node.setAttribute(ROLE_ATTR, normalizeRole(role));
    selectableNodes.push(node);
  });

  document.addEventListener('click', handleSelectionClick, true);
  ensureSelectionBanner();
  return { success: true };
}

function exitSelectionMode() {
  selectionModeActive = false;
  selectedKeys = [];
  selectableNodes.forEach((node) => {
    try {
      node.removeAttribute(SELECTABLE_ATTR);
      node.removeAttribute(SELECTED_ATTR);
      node.removeAttribute(TURN_INDEX_ATTR);
      node.removeAttribute(ROLE_ATTR);
    } catch (_err) {}
  });
  selectableNodes = [];
  document.removeEventListener('click', handleSelectionClick, true);
  removeSelectionBanner();
}

function recalculateStats(messages) {
  const userMessages = messages.filter((m) => m.role === 'user');
  const modelMessages = messages.filter((m) => m.role === 'model' || m.role === 'assistant');
  const uploadedFiles = messages.reduce((total, msg) => total + ((msg.uploaded_files || msg.uploadedFiles || []).length), 0);
  const generatedMedia = messages.reduce((total, msg) => total + ((msg.media || msg.images || []).length), 0);
  const embeddedDocs = messages.reduce((total, msg) => total + ((msg.embedded_documents || []).length), 0);
  return {
    total_messages: messages.length,
    user_messages: userMessages.length,
    model_messages: modelMessages.length,
    uploaded_files: uploadedFiles,
    generated_media: generatedMedia,
    embedded_documents: embeddedDocs
  };
}

function applySelectedFilter(result, keys) {
  const allMessages = Array.isArray(result.messages) ? result.messages : [];
  if (!allMessages.length) {
    return { ...result, success: false, error: 'No messages found to export.' };
  }

  if (!keys || !keys.length) {
    return { ...result, success: false, error: 'No selected messages found. Select at least one message first.' };
  }

  let filtered = [];
  if (keys.length === 1) {
    const firstKey = keys[0];
    const startIndex = allMessages.findIndex((msg) => candidateKey(msg.turn_index, normalizeRole(msg.role)) === firstKey);
    if (startIndex < 0) {
      return { ...result, success: false, error: 'Selected message could not be matched. Re-select the message and try again.' };
    }
    filtered = allMessages.slice(startIndex);
  } else {
    const keySet = new Set(keys);
    filtered = allMessages.filter((msg) => keySet.has(candidateKey(msg.turn_index, normalizeRole(msg.role))));
  }

  const updated = { ...result };
  updated.messages = filtered;
  updated.count = filtered.length;
  updated.statistics = recalculateStats(filtered);
  updated.selection_export = {
    mode: keys.length === 1 ? 'from_selected_to_latest' : 'selected_only',
    selected_count: keys.length
  };
  return updated;
}

async function runSelectedExport() {
  if (!selectionModeActive) {
    const started = enterSelectionMode();
    if (!started.success) {
      return {
        success: false,
        error: started.error,
        timestamp: new Date().toISOString()
      };
    }
    return {
      success: false,
      selectionRequired: true,
      message: 'Selection mode is active. Select one or more messages in the page, then click Export Selected again.',
      selectedCount: 0,
      timestamp: new Date().toISOString()
    };
  }

  if (!selectedKeys.length) {
    return {
      success: false,
      selectionRequired: true,
      message: 'No message selected yet. Select at least one message, then click Export Selected again.',
      selectedCount: 0,
      timestamp: new Date().toISOString()
    };
  }

  if (typeof window.runScrape !== 'function') {
    return {
      success: false,
      error: 'Scraper is not initialized on this page.',
      timestamp: new Date().toISOString()
    };
  }

  const result = await window.runScrape();
  if (!result || !result.success) {
    return result;
  }

  const filtered = applySelectedFilter(result, selectedKeys.slice());
  exitSelectionMode();
  return filtered;
}

// Listen for messages from the popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCRAPE_PAGE") {
    // Execute scraping asynchronously
    // runScrape() is exposed globally by initializeScrapers()
    if (typeof window.runScrape === 'function') {
      window.runScrape()
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error("[AI-Chat-Exporter] Scrape failed:", error);
          sendResponse({
            success: false,
            error: mapScrapeError(error),
            timestamp: new Date().toISOString(),
          });
        });
    } else {
      console.error("[AI-Chat-Exporter] runScrape() not available - scraper not initialized for this platform");
      sendResponse({
        success: false,
        error: `No scraper initialized for this page. URL: ${window.location.href}`,
        timestamp: new Date().toISOString(),
        diagnostic: {
          url: window.location.href,
          runScrapeAvailable: typeof window.runScrape === "function",
          scrapeGeminiChatAvailable: typeof window.scrapeGeminiChat === "function",
          scrapeChatGPTAvailable: typeof window.scrapeChatGPT === "function",
          scrapeClaudeAvailable: typeof window.scrapeClaude === "function",
        }
      });
    }

    // Return true to indicate async response
    return true;
  }

  if (request.action === "EXPORT_SELECTED") {
    runSelectedExport()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("[AI-Chat-Exporter] Selected export failed:", error);
        sendResponse({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      });
    return true;
  }

  if (request.action === "CLEAR_SELECTION_MODE") {
    exitSelectionMode();
    sendResponse({ success: true });
    return true;
  }

  // Ping response for health check
  if (request.action === "PING") {
    sendResponse({ status: "ready" });
    return true;
  }

  // Unknown action
  console.warn("[AI-Chat-Exporter] Unknown action:", request.action);
  sendResponse({ success: false, error: "Unknown action" });
  return true;
});

// Notify that content script is ready
browserAPI.runtime.sendMessage({ type: "CONTENT_READY" }, (response) => {
  if (browserAPI.runtime.lastError) {
    // Extension context might not be ready, this is normal
  }
});
