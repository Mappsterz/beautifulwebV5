const {
  buildPurchaseUnit,
  getPaypalAccessToken,
  jsonResponse,
  normalizeCartItems,
  parseJsonBody,
  paypalBaseUrl
} = require('./paypal-utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const { cart } = parseJsonBody(event);
    const items = normalizeCartItems(cart);
    const accessToken = await getPaypalAccessToken();

    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [buildPurchaseUnit(items)]
      })
    });

    const order = await response.json();

    if (!response.ok) {
      return jsonResponse(response.status, {
        error: order.message || order.error || 'PayPal order creation failed.',
        details: order.details || []
      });
    }

    return jsonResponse(200, {
      id: order.id,
      status: order.status
    });
  } catch (error) {
    return jsonResponse(400, { error: error.message || 'Unable to create PayPal order.' });
  }
};
