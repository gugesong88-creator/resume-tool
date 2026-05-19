const https = require('https');

/**
 * Send a payload to a Feishu custom bot webhook.
 * If `payload` is a string, it will be wrapped as a simple text message.
 * If `payload` is an object, it will be sent as the raw JSON body (useful for `post` messages).
 */
function sendFeishuWebhook(webhookUrl, payload) {
  if (!webhookUrl) return Promise.resolve({ skipped: true });
  try {
    const bodyObj = typeof payload === 'string' ? { msg_type: 'text', content: { text: payload } } : payload;
    const body = JSON.stringify(bodyObj);
    const u = new URL(webhookUrl);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      });
      req.on('error', (err) => reject(err));
      req.write(body);
      req.end();
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = { sendFeishuWebhook };
