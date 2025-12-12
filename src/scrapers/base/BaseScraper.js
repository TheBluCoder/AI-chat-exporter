/**
 * Base Scraper Class
 * Abstract base class for all platform-specific scrapers
 * Provides common functionality and standardized message format
 *
 * STANDARDIZED MESSAGE FORMAT (enforced across all scrapers):
 * {
 *   role: "user" | "assistant" | "model",
 *   content: string,
 *   media: [{ type: string, url: string, name: string, base64?: string }] | null,
 *   uploaded_files: [{ name: string, type: string, url: string, content?: string, encoding?: string, mimeType?: string }] | null,
 *   embedded_documents: [{ title: string, content: string, type: string }] | null,
 *   timestamp: string
 * }
 */

export class BaseScraper {
  /**
   * @param {Object} config - Platform-specific configuration
   * @param {string} config.platform - Platform name
   * @param {Object} config.selectors - DOM selectors
   * @param {Object} config.scrollConfig - Scroll configuration
   */
  constructor(config) {
    if (!config) {
      throw new Error('BaseScraper requires a configuration object');
    }

    this.config = config;
    this.platform = config.platform;
    this.selectors = config.selectors;
    this.scrollConfig = config.scrollConfig || {
      maxAttempts: 50,
      delay: 800,
      stabilityDelay: 500,
      stabilityTimeout: 8000,
    };
  }

  /**
   * Main scraping entry point
   * Template method pattern - calls hooks in sequence
   * @returns {Promise<Object>} Scraping result
   */
  async scrape() {
    try {
      console.log(`[${this.platform}-Scraper] Starting scrape for:`, location.href);

      // Wait for container
      const container = await this.waitForContainer();
      if (!container) {
        throw new Error('Could not find conversation container');
      }

      // Auto-scroll to load full history
      await this.scrollToLoadHistory(container);

      // Wait for content to stabilize
      await this.waitForStableContent(container);

      // Extract all messages
      const messages = await this.extractAllMessages(container);

      // Calculate statistics
      const statistics = this.calculateStatistics(messages);

      console.log(`[${this.platform}-Scraper] Successfully extracted ${messages.length} messages`);

      return this.formatResult(messages, statistics);
    } catch (error) {
      console.error(`[${this.platform}-Scraper] Scrape error:`, error);
      return this.formatError(error);
    }
  }

  /**
   * Wait for the main container element
   * Override this if platform needs custom waiting logic
   * @returns {Promise<Element>}
   */
  async waitForContainer() {
    const selector = this.selectors.CONTAINER || this.selectors.CHAT_CONTAINER;
    return await this.waitForElement(selector, 10000);
  }

  /**
   * Scroll to load full conversation history
   * Override this for platform-specific scroll behavior
   * @param {Element} container - Scroll container
   * @returns {Promise<void>}
   */
  async scrollToLoadHistory(container) {
    // Default implementation: scroll to top
    await this.autoScrollToTop(container);
  }

  /**
   * Extract all messages from the container
   * MUST be implemented by subclass
   * @param {Element} container - Conversation container
   * @returns {Promise<Array>} Array of message objects
   */
  async extractAllMessages(container) {
    throw new Error('extractAllMessages() must be implemented by subclass');
  }

  /**
   * Auto-scroll to top to load history
   * Shared implementation for most platforms
   * @param {Element} startElement - Element to start searching from
   * @returns {Promise<void>}
   */
  async autoScrollToTop(startElement) {
    console.log(`[${this.platform}-Scraper] Starting auto-scroll sequence...`);

    // Find scrollable container
    let scrollContainer = this.findScrollContainer(startElement);

    console.log(`[${this.platform}-Scraper] Identified scroll container:`, scrollContainer.tagName);

    let previousHeight = scrollContainer.scrollHeight;
    let noChangeCount = 0;

    for (let i = 0; i < this.scrollConfig.maxAttempts; i++) {
      scrollContainer.scrollTop = 0;
      await this.sleep(this.scrollConfig.delay);

      const currentHeight = scrollContainer.scrollHeight;

      if (currentHeight > previousHeight) {
        console.log(`[${this.platform}-Scraper] Loaded older messages (${currentHeight}px vs ${previousHeight}px)`);
        previousHeight = currentHeight;
        noChangeCount = 0;
      } else {
        // Double-check with wiggle
        scrollContainer.scrollTop = 10;
        await this.sleep(300);
        scrollContainer.scrollTop = 0;

        if (scrollContainer.scrollHeight <= previousHeight) {
          noChangeCount++;
          if (noChangeCount >= 2) {
            console.log(`[${this.platform}-Scraper] Reached top of history`);
            break;
          }
        }
      }
    }
  }

  /**
   * Find the actual scrollable container
   * @param {Element} startElement - Starting element
   * @returns {Element} Scrollable container
   */
  findScrollContainer(startElement) {
    let scrollContainer = startElement;

    // Try to find a scrollable parent
    if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
      let current = scrollContainer;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (
          style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          current.scrollHeight > current.clientHeight
        ) {
          scrollContainer = current;
          break;
        }
        current = current.parentElement;
      }
    }

    // Fallback to main or documentElement
    if (!scrollContainer || scrollContainer === document.body) {
      scrollContainer = document.querySelector('main') || document.documentElement;
    }

    return scrollContainer;
  }

  /**
   * Wait for content to stabilize (stop changing)
   * @param {Element} container - Container to watch
   * @returns {Promise<void>}
   */
  async waitForStableContent(container) {
    const checkInterval = this.scrollConfig.stabilityDelay;
    const timeout = this.scrollConfig.stabilityTimeout;

    let previousContent = container.innerHTML.length;
    let stableCount = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await this.sleep(checkInterval);
      const currentContent = container.innerHTML.length;

      if (currentContent === previousContent) {
        stableCount++;
        if (stableCount >= 3) {
          console.log(`[${this.platform}-Scraper] Content stabilized`);
          return;
        }
      } else {
        stableCount = 0;
        previousContent = currentContent;
      }
    }

    console.warn(`[${this.platform}-Scraper] Content did not stabilize within timeout`);
  }

  /**
   * Calculate statistics from messages
   * @param {Array} messages - Array of messages
   * @returns {Object} Statistics object
   */
  calculateStatistics(messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    const modelMessages = messages.filter(m => m.role === 'model' || m.role === 'assistant');

    const uploadedFiles = messages.reduce((total, msg) =>
      total + (msg.uploaded_files?.length || 0), 0
    );

    const generatedMedia = messages.reduce((total, msg) =>
      total + (msg.media?.length || 0), 0
    );

    const embeddedDocs = messages.reduce((total, msg) =>
      total + (msg.embedded_documents?.length || 0), 0
    );

    return {
      total_messages: messages.length,
      user_messages: userMessages.length,
      model_messages: modelMessages.length,
      uploaded_files: uploadedFiles,
      generated_media: generatedMedia,
      embedded_documents_count: embeddedDocs,
    };
  }

  /**
   * Format successful result
   * @param {Array} messages - Extracted messages
   * @param {Object} statistics - Statistics object
   * @returns {Object} Formatted result
   */
  formatResult(messages, statistics) {
    return {
      success: true,
      messages,
      count: messages.length,
      statistics,
      timestamp: new Date().toISOString(),
      url: location.href,
      platform: this.platform,
      scraper_version: '3.0.0',
    };
  }

  /**
   * Format error result
   * @param {Error} error - Error object
   * @returns {Object} Formatted error
   */
  formatError(error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      url: location.href,
      platform: this.platform,
      debug_info: {
        error_stack: error.stack,
      },
    };
  }

  /**
   * Wait for an element to appear in the DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element|null>}
   */
  async waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await this.sleep(100);
    }

    console.warn(`[${this.platform}-Scraper] Element not found: ${selector}`);
    return null;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a standardized message object
   * @param {Object} params - Message parameters
   * @returns {Object} Standardized message
   */
  createMessage({
    role,
    content = '',
    media = null,
    uploaded_files = null,
    embedded_documents = null,
    turn_index = 0,
    turn_id = null,
  }) {
    const message = {
      role,
      content,
      media,
      uploaded_files,
      embedded_documents,
      timestamp: new Date().toISOString(),
    };

    if (turn_index !== undefined) {
      message.turn_index = turn_index;
    }

    if (turn_id) {
      message.turn_id = turn_id;
    }

    return message;
  }
}

export default BaseScraper;
