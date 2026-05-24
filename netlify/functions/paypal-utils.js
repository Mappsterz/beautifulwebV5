const PRODUCT_CATALOG = {
  'hc-sweatshirt': {
    name: 'Highland Cow Sweatshirt',
    price: '58.00',
    sku: 'HC-SWEATSHIRT'
  },
  'hc-tee': {
    name: 'Highland Cow T-Shirt',
    price: '38.00',
    sku: 'HC-TEE'
  }
};

const VALID_SIZES = new Set(['S', 'M', 'L', 'XL', '2XL']);
const VALID_COLORS = new Set(['Light', 'Dark']);
const CURRENCY = 'USD';

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

function parseJsonBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.body);
}

function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function requirePaypalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET environment variables.');
  }

  return { clientId, clientSecret };
}

async function getPaypalAccessToken() {
  const { clientId, clientSecret } = requirePaypalCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Unable to authenticate with PayPal.');
  }

  return data.access_token;
}

function normalizeCartItems(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('Cart is empty.');
  }

  return cart.map((item) => {
    const product = PRODUCT_CATALOG[item.baseId];
    const quantity = Number.parseInt(item.quantity, 10);

    if (!product) {
      throw new Error('Cart contains an unknown product.');
    }

    if (!VALID_SIZES.has(item.size)) {
      throw new Error(`Invalid size for ${product.name}.`);
    }

    if (!VALID_COLORS.has(item.color)) {
      throw new Error(`Invalid color for ${product.name}.`);
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error(`Invalid quantity for ${product.name}.`);
    }

    return {
      baseId: item.baseId,
      name: product.name,
      sku: `${product.sku}-${item.size}-${item.color}`.toUpperCase(),
      size: item.size,
      color: item.color,
      quantity,
      unitAmount: product.price
    };
  });
}

function calculateTotal(items) {
  const cents = items.reduce((sum, item) => {
    return sum + Math.round(Number.parseFloat(item.unitAmount) * 100) * item.quantity;
  }, 0);

  return (cents / 100).toFixed(2);
}

function buildPurchaseUnit(items) {
  const total = calculateTotal(items);

  return {
    amount: {
      currency_code: CURRENCY,
      value: total,
      breakdown: {
        item_total: {
          currency_code: CURRENCY,
          value: total
        }
      }
    },
    items: items.map((item) => ({
      name: item.name,
      sku: item.sku,
      quantity: String(item.quantity),
      unit_amount: {
        currency_code: CURRENCY,
        value: item.unitAmount
      },
      description: `Size ${item.size} / ${item.color}`
    })),
    custom_id: JSON.stringify(items.map(({ baseId, size, color, quantity }) => ({
      baseId,
      size,
      color,
      quantity
    })))
  };
}

module.exports = {
  CURRENCY,
  buildPurchaseUnit,
  getPaypalAccessToken,
  jsonResponse,
  normalizeCartItems,
  parseJsonBody,
  paypalBaseUrl
};
