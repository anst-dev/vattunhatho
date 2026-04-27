const { google } = require('googleapis');

const sheets = google.sheets('v4');

let auth = null;
let spreadsheetId = null;
let headersCache = {};

const NESTED_FIELDS = {};

function isConfigured() {
  return !!(process.env.GOOGLE_SHEET_ID &&
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
            process.env.GOOGLE_PRIVATE_KEY);
}

function getAuth() {
  if (auth) return auth;
  auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  spreadsheetId = process.env.GOOGLE_SHEET_ID;
  return auth;
}

async function ensureSheet(sheetName, headers) {
  if (headersCache[sheetName]) return headersCache[sheetName];

  const a = getAuth();

  try {
    const meta = await sheets.spreadsheets.get({ auth: a, spreadsheetId });
    const existing = meta.data.sheets.find(s => s.properties.title === sheetName);

    if (existing) {
      const resp = await sheets.spreadsheets.values.get({
        auth: a, spreadsheetId, range: `${sheetName}!1:1`
      });
      if (resp.data.values && resp.data.values[0]) {
        headersCache[sheetName] = resp.data.values[0];
        return headersCache[sheetName];
      }
    }

    // Create sheet if not exists
    if (!existing) {
      await sheets.spreadsheets.batchUpdate({
        auth: a, spreadsheetId,
        resource: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
      });
    }

    // Write headers
    await sheets.spreadsheets.values.update({
      auth: a, spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values: [headers] }
    });

    headersCache[sheetName] = headers;
    return headers;
  } catch (err) {
    console.error(`ensureSheet error (${sheetName}):`, err.message);
    throw err;
  }
}

function deserializeRow(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    let val = row[i] !== undefined ? row[i] : '';
    if (NESTED_FIELDS[headers] && NESTED_FIELDS[headers].includes(h)) {
      try { val = JSON.parse(val); } catch (e) { /* keep as string */ }
    }
    // Auto-convert numbers
    if (val !== '' && !isNaN(val) && val !== 'true' && val !== 'false') {
      val = Number(val);
    }
    if (val === 'true') val = true;
    if (val === 'false') val = false;
    obj[h] = val;
  });
  return obj;
}

function serializeRow(headers, obj) {
  return headers.map(h => {
    let val = obj[h] !== undefined ? obj[h] : '';
    if (typeof val === 'object') val = JSON.stringify(val);
    return val;
  });
}

async function read(fileName) {
  const a = getAuth();
  const sheetName = fileName;

  const meta = await sheets.spreadsheets.get({ auth: a, spreadsheetId });
  const exists = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!exists) return [];

  const resp = await sheets.spreadsheets.values.get({
    auth: a, spreadsheetId, range: `${sheetName}!A:ZZ`
  });

  const rows = resp.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];
  headersCache[sheetName] = headers;

  return rows.slice(1).map(row => deserializeRow(headers, row));
}

async function write(fileName, data) {
  const a = getAuth();
  const sheetName = fileName;

  if (!data || data.length === 0) {
    const headers = headersCache[sheetName] || ['id'];
    await ensureSheet(sheetName, headers);
    await sheets.spreadsheets.values.clear({
      auth: a, spreadsheetId, range: `${sheetName}!A2:ZZ`
    });
    return;
  }

  const headers = Object.keys(data[0]);
  await ensureSheet(sheetName, headers);

  await sheets.spreadsheets.values.clear({
    auth: a, spreadsheetId, range: `${sheetName}!A2:ZZ`
  });

  const values = data.map(item => serializeRow(headers, item));
  await sheets.spreadsheets.values.update({
    auth: a, spreadsheetId,
    range: `${sheetName}!A2`,
    valueInputOption: 'RAW',
    resource: { values }
  });
}

async function append(fileName, item) {
  const data = await read(fileName);
  data.push(item);
  await write(fileName, data);
  return item;
}

module.exports = { isConfigured, read, write, append };
