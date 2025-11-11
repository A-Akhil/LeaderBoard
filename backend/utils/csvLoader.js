const fs = require('fs');
const { Readable } = require('stream');
const csv = require('csv-parser');

/**
 * Loads a CSV source into memory as an array of plain objects.
 * Accepts file paths, Buffers, readable streams, or Multer file objects.
 * @param {string|Buffer|Readable|object} source
 * @returns {Promise<object[]>}
 */
async function loadCsv(source) {
  const rows = [];

  const stream = resolveCsvStream(source);

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  return rows;
}

/**
 * Normalises different CSV sources into a readable stream for parsing.
 * @param {string|Buffer|Readable|object} source
 * @returns {Readable}
 */
function resolveCsvStream(source) {
  if (!source) {
    throw new Error('CSV source is required');
  }

  if (typeof source === 'string') {
    if (!fs.existsSync(source)) {
      throw new Error(`CSV file not found at path: ${source}`);
    }
    return fs.createReadStream(source);
  }

  if (Buffer.isBuffer(source)) {
    return Readable.from(source);
  }

  if (source instanceof Readable) {
    return source;
  }

  if (source.path && typeof source.path === 'string') {
    if (!fs.existsSync(source.path)) {
      throw new Error(`CSV file not found at path: ${source.path}`);
    }
    return fs.createReadStream(source.path);
  }

  if (source.buffer && Buffer.isBuffer(source.buffer)) {
    return Readable.from(source.buffer);
  }

  throw new Error('Unsupported CSV source type');
}

module.exports = {
  loadCsv
};
