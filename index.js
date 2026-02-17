import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import csv from 'csv-parser';

const auth = Buffer.from(
  `${process.env.ATLASSAN_EMAIL}:${process.env.ATLASSAN_API_KEY}`
).toString('base64');

function readCsvToArray(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

function pick(row, possibleKeys) {
  for (const key of possibleKeys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  return '';
}

function buildHtmlTable(rows) {
  let html = `
  <h1>Software Tracker</h1>
  <table>
    <thead>
      <tr>
        <th>Display Name</th>
        <th>Version</th>
        <th>Publisher</th>
      </tr>
    </thead>
    <tbody>
  `;

  for (const row of rows) {
    const displayName = pick(row, ['DisplayName', 'Display Name', 'Name', 'Display Name ']);
    const displayVersion = pick(row, ['DisplayVersion', 'Display Version', 'Version']);
    const publisher = pick(row, ['Publisher', 'Vendor', 'Company']);

    html += `
      <tr>
        <td>${displayName}</td>
        <td>${displayVersion}</td>
        <td>${publisher}</td>
      </tr>
    `;
  }

  html += `
    </tbody>
  </table>
  `;

  return html;
}

async function createPage() {
  const records = await readCsvToArray('./installed_software.csv');

  console.log('rows parsed:', records.length);
  console.log('first row keys:', records[0] ? Object.keys(records[0]) : 'NO ROWS');

  const htmlTable = buildHtmlTable(records);

  const response = await fetch(`${process.env.ATLASSAN_BASE_URL}/api/v2/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spaceId: Number(process.env.ATLASSAN_SPACE_ID),
      status: 'current',
      title: 'Software Tracker',
      body: {
        representation: 'storage',
        value: htmlTable,
      },
    }),
  });

  const data = await response.json();
  console.log('Confluence response:', data);
}

createPage().catch(console.error);

