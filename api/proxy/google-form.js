// /api/proxy/google-form.js
export const config = {
  maxDuration: 10,
};

function cleanHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { formId } = req.query;
    if (!formId) return res.status(400).json({ error: 'formId is required' });

    console.log(`[GoogleForm] Fetching form: ${formId}`);

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const fetchOpts = {
      headers: fetchHeaders,
      redirect: 'follow',
      // 8.5s total constraint to fit inside Vercel 10s execution limit
      signal: AbortSignal.timeout(8500),
    };

    const authSignals = [
      "Sign in to continue",
      "Sign in to Google",
      "Sign in \u2013 Google Accounts",
      "You need permission",
      "Can't access your Google Account",
      "This form can only be viewed by users in the owner"
    ];
    const isAuthWall = (html) => authSignals.some(signal => html.includes(signal));

    // ── Strategy 1: Standard viewform ──
    const viewformUrl = `https://docs.google.com/forms/d/${formId}/viewform`;
    let response = await fetch(viewformUrl, fetchOpts);
    let html = await response.text();

    if (response.ok && !isAuthWall(html)) {
      return res.status(200).json({ html: cleanHtml(html), strategy: 'viewform', authRequired: false });
    }

    // ── Strategy 2: formResponse URL ──
    const formResponseUrl = `https://docs.google.com/forms/d/${formId}/formResponse`;
    try {
      response = await fetch(formResponseUrl, fetchOpts);
      html = await response.text();

      if (response.ok && !isAuthWall(html)) {
        return res.status(200).json({ html: cleanHtml(html), strategy: 'formResponse', authRequired: false });
      }
    } catch (e) {
      console.log(`[GoogleForm] Strategy 2 setup fetch error: ${e.message}`);
    }

    // ── Strategy 3: Extract FB_PUBLIC_LOAD_DATA_ ──
    const fbDataMatch = html.match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
    if (fbDataMatch) {
      return res.status(200).json({
        fbPublicLoadData: fbDataMatch[1],
        strategy: 'fb_public_load_data',
        authRequired: true,
        html: cleanHtml(html)
      });
    }

    // Fallback
    return res.status(200).json({
      html: cleanHtml(html),
      strategy: 'fallback',
      authRequired: true
    });

  } catch (err) {
    console.error('[GoogleForm] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Google Form or timed out', authRequired: true });
  }
}
