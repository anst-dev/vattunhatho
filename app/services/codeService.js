const db = require('./jsonDbService');

const counters = {};

async function getNextCode(fileName, prefix) {
  const key = `${fileName}:${prefix}`;
  if (!counters[key]) {
    const data = await db.read(fileName);
    let maxNum = 0;
    data.forEach(item => {
      const match = item.id && item.id.match(new RegExp(prefix + '(\\d+)'));
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });
    counters[key] = maxNum;
  }
  counters[key]++;
  return `${prefix}${String(counters[key]).padStart(3, '0')}`;
}

module.exports = { getNextCode };
