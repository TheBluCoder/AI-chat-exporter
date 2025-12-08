async function scrapeGeneric() {
    console.log('[Generic-Scraper] Using generic scraper function');
    return {
        success: true,
        messages: [],
        count: 0,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        platform: "Generic",
        warning: "Generic scraper not fully implemented"
    };
}

if (typeof window !== 'undefined') {
    window.scrapeGeneric = scrapeGeneric;
}