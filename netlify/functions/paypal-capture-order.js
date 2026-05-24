const {
  getPaypalAccessToken,
  jsonResponse,
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
    const { orderID } = parseJsonBody(event);

    if (!orderID || typeof orderID !== 'string') {
      return jsonResponse(400, { error: 'Missing PayPal order ID.' });
    }

    const accessToken = await getPaypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const order = await response.json();

    if (!response.ok) {
      return jsonResponse(response.status, {
        error: order.message || order.error || 'PayPal capture failed.',
        details: order.details || []
      });
    }

    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];

    if (order.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
      return jsonResponse(422, {
        error: 'PayPal order was not completed.',
        status: order.status,
        captureStatus: capture?.status || null
      });
    }

    return jsonResponse(200, {
      id: order.id,
      status: order.status,
      captureId: capture.id,
      captureStatus: capture.status,
      amount: capture.amount
    });
  } catch (error) {
    return jsonResponse(400, { error: error.message || 'Unable to capture PayPal order.' });
  }
};
