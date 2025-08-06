import { cleanDefRow } from './cleanData.js';

const POPULATION = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165
};

const COLORS = {
  'Hispanic or Latino': '#e91e63',
  'White': '#ff9800',
  'Black or African American': '#ffe600',
  'Asian': '#4caf50',
  'American Indian and Alaska Native': '#00bcd4',
  'Native Hawaiian and Other Pacific Islander': '#9c27b0'
};

const DEF_COLOR = '#007acc';
const POP_COLOR = '#ff9800';

const folder = './data/';

async function getLatestYear() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--) {
    const res = await fetch(`${folder}defendants_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  throw new Error('No defendant file found');
}

function normalizeEthnicity(raw) {
  const eth = String(raw).toLowerCase();
  if (eth.includes('white')) return 'White';
  if (eth.includes('black')) return 'Black or African American';
  if (eth.includes('asian')) return 'Asian';
  if (eth.includes('hispanic') || eth.includes('latino')) return 'Hispanic or Latino';
  if (eth.includes('american indian') || eth.includes('alaska')) return 'American Indian and Alaska Native';
  if (eth.includes('hawaiian') || eth.includes('pacific')) return 'Native Hawaiian and Other Pacific Islander';
  return null;
}

async function loadData() {
  const year = await getLatestYear();
  const buffer = await fetch(`${folder}defendants_${year}.xlsx`).then(r => r.arrayBuffer());
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const counts = {};
  let total = 0;

  raw.forEach(row => {
    const d = cleanDefRow(row);
    if (!d || !d.ethnicity) return;
    const norm = normalizeEthnicity(d.ethnicity);
    if (!norm) return;
    counts[norm] = (counts[norm] || 0) + 1;
    total++;
  });

  const labels = Object.keys(POPULATION);
  const popTotal = Object.values(POPULATION).reduce((a, b) => a + b, 0);
  const defData = labels.map(k => ((counts[k] || 0) / total) * 100);
  const popData = labels.map(k => (POPULATION[k] / popTotal) * 100);
  const chartColors = labels.map(k => COLORS[k]);

  buildChart(labels, defData, popData, chartColors);
}

function buildChart(labels, defData, popData, chartColors) {
  const ctx = document.getElementById('barChart');
  const hoverRace = document.getElementById('hoverRace');
  const hoverDef = document.getElementById('hoverDef');
  const hoverPop = document.getElementById('hoverPop');

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Defendants',
          data: defData,
          backgroundColor: DEF_COLOR
        },
        {
          label: 'Population',
          data: popData,
          backgroundColor: POP_COLOR
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: val => val + '%'
          },
          suggestedMax: 100
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          enabled: false
        }
      },
      onHover: (event, chartElement) => {
        if (chartElement.length === 0) return;

        const i = chartElement[0].index;
        hoverRace.textContent = labels[i];
        hoverDef.textContent = `${defData[i].toFixed(2)}% of defendants`;
        hoverPop.textContent = `${popData[i].toFixed(2)}% of population`;
      }
    }
  });
}

loadData();
