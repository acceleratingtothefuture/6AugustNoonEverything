// defendants.js
import { cleanDefRow } from './cleanData.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';

const CENSUS_COUNTS = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165
};

const COLOR_MAP = {
  'Hispanic or Latino': '#f44336',
  'White': '#2196f3',
  'Black or African American': '#4caf50',
  'Asian': '#ff9800',
  'American Indian and Alaska Native': '#9c27b0',
  'Native Hawaiian and Other Pacific Islander': '#00bcd4'
};

const ETHNICITY_MAP = {
  'hispanic': 'Hispanic or Latino',
  'white': 'White',
  'black': 'Black or African American',
  'african american': 'Black or African American',
  'asian': 'Asian',
  'alaska': 'American Indian and Alaska Native',
  'american indian': 'American Indian and Alaska Native',
  'hawaiian': 'Native Hawaiian and Other Pacific Islander',
  'pacific': 'Native Hawaiian and Other Pacific Islander'
};

function standardizeEthnicity(raw) {
  const t = String(raw).toLowerCase();
  for (const key in ETHNICITY_MAP) {
    if (t.includes(key)) return ETHNICITY_MAP[key];
  }
  return null;
}

const folder = './data/';
let rows = [];

async function loadDefendants() {
  const y = new Date().getFullYear();
  const defBuf = await fetch(`${folder}defendants_${y}.xlsx`).then(r => r.arrayBuffer());
  const wb = XLSX.read(defBuf, { type: 'array' });
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  const counts = {};
  let total = 0;

  raw.forEach(d => {
    const clean = cleanDefRow(d);
    if (!clean) return;
    const group = standardizeEthnicity(clean.ethnicity);
    if (!group || !(group in CENSUS_COUNTS)) return;
    counts[group] = (counts[group] || 0) + 1;
    total++;
  });

  buildCharts(counts, total);
}

function buildCharts(defCounts, totalDefendants) {
  const labels = Object.keys(CENSUS_COUNTS);
  const defData = labels.map(g => +(100 * (defCounts[g] || 0) / totalDefendants).toFixed(2));
  const popData = labels.map(g => +(100 * CENSUS_COUNTS[g] / Object.values(CENSUS_COUNTS).reduce((a, b) => a + b)).toFixed(2));
  const colors = labels.map(g => COLOR_MAP[g]);

  const ctx1 = document.getElementById('defChart').getContext('2d');
  const ctx2 = document.getElementById('popChart').getContext('2d');
  const summary = document.getElementById('summaryBox');

  const chartOptions = (title) => ({
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: title === 'Defendants' ? defData : popData,
        backgroundColor: colors
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: title
        },
        tooltip: { enabled: false }
      },
      onHover: (e, els, chart) => {
        if (!els.length) return;
        const i = els[0].index;
        const l = labels[i];
        summary.innerHTML = `<b style="color:${colors[i]}">${l}</b>: ${defData[i]}% of defendants vs ${popData[i]}% of county population`;
      }
    }
  });

  new Chart(ctx1, chartOptions('Defendants'));
  new Chart(ctx2, chartOptions('Population'));
}

document.addEventListener('DOMContentLoaded', loadDefendants);
