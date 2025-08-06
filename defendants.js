import { cleanDefRow } from './cleanData.js';

const FOLDER = './data/';

const COUNTY_POP = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165,
  'Two or More Races': 49795,
  'Some Other Race': 70528
};

const COLORS = ['#2196f3', '#f44336'];

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
  return raw.map(cleanDefRow).filter(d => d && d.ethnicity && d.ethnicity !== 'Unknown');
}

function countByEthnicity(rows) {
  const counts = {};
  rows.forEach(d => {
    const eth = d.ethnicity;
    counts[eth] = (counts[eth] || 0) + 1;
  });
  return counts;
}

function buildChart(defCounts) {
  const totalDefendants = Object.values(defCounts).reduce((a, b) => a + b, 0);
  const totalPop = Object.values(COUNTY_POP).reduce((a, b) => a + b, 0);

  const allGroups = new Set([
    ...Object.keys(defCounts),
    ...Object.keys(COUNTY_POP)
  ]);

  const labels = Array.from(allGroups).sort((a, b) => a.localeCompare(b));
  const defData = labels.map(k => (defCounts[k] || 0) / totalDefendants * 100);
  const popData = labels.map(k => (COUNTY_POP[k] || 0) / totalPop * 100);

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
