import { cleanDefRow } from './cleanData.js';

const FOLDER = './data/';

const INCLUDED_CATEGORIES = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165
};

const COLORS = ['#2196f3', '#f44336'];

function mapEthnicity(rawValue) {
  const val = (rawValue || '').toLowerCase();

  if (val.includes('hispanic')) return 'Hispanic or Latino';
  if (val.includes('white')) return 'White';
  if (val.includes('black')) return 'Black or African American';
  if (val.includes('asian')) return 'Asian';
  if (val.includes('american indian')) return 'American Indian and Alaska Native';
  if (val.includes('pacific islander') || val.includes('hawaiian')) return 'Native Hawaiian and Other Pacific Islander';

  return null; // not one of the six valid groups
}

async function discoverLatestYear() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--) {
    const res = await fetch(`${FOLDER}defendants_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  throw new Error('No defendants_YYYY.xlsx file found.');
}

async function loadData(year) {
  const res = await fetch(`${FOLDER}defendants_${year}.xlsx`);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return raw
    .map(cleanDefRow)
    .map(d => {
      const mapped = mapEthnicity(d.ethnicity);
      return mapped ? { ...d, ethnicity: mapped } : null;
    })
    .filter(d => d);
}

function countByEthnicity(rows) {
  const counts = {};
  Object.keys(INCLUDED_CATEGORIES).forEach(k => counts[k] = 0);

  rows.forEach(d => {
    if (counts.hasOwnProperty(d.ethnicity)) {
      counts[d.ethnicity]++;
    }
  });

  return counts;
}

function buildChart(defCounts) {
  const totalDefendants = Object.values(defCounts).reduce((a, b) => a + b, 0);
  const totalPop = Object.values(INCLUDED_CATEGORIES).reduce((a, b) => a + b, 0);

  const labels = Object.keys(INCLUDED_CATEGORIES);
  const defData = labels.map(k => (defCounts[k] || 0) / totalDefendants * 100);
  const popData = labels.map(k => INCLUDED_CATEGORIES[k] / totalPop * 100);

  const ctx = document.getElementById('ethnicityChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Defendants',
          data: defData,
          backgroundColor: COLORS[0]
        },
        {
          label: 'County Population',
          data: popData,
          backgroundColor: COLORS[1]
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => v + '%' }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => ctx.raw.toFixed(2) + '%'
          }
        }
      }
    }
  });
}

discoverLatestYear()
  .then(loadData)
  .then(countByEthnicity)
  .then(buildChart)
  .catch(err => {
    console.error(err);
    alert('Failed to load defendant data.');
  });
