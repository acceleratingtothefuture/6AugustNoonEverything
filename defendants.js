import { cleanDefRow } from './cleanData.js';

const POPULATION = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165
};

const COLORS = [
  '#e91e63', '#ff9800', '#ffe600', '#4caf50', '#00bcd4', '#9c27b0'
];

const DIM_COLORS = COLORS.map(c => c + '40'); // faded for hover

const folder = './data/';

async function getLatestYear() {
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 2015; y--) {
    const res = await fetch(`${folder}defendants_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  throw new Error('No defendant file found.');
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

    const eth = normalizeEthnicity(d.ethnicity);
    if (!eth) return;

    counts[eth] = (counts[eth] || 0) + 1;
    total++;
  });

  const labels = Object.keys(POPULATION);
  const popTotal = Object.values(POPULATION).reduce((a, b) => a + b, 0);
  const defData = labels.map(k => ((counts[k] || 0) / total) * 100);
  const popData = labels.map(k => (POPULATION[k] / popTotal) * 100);

  buildCharts(labels, defData, popData);
}

function buildCharts(labels, defData, popData) {
  const ctxDef = document.getElementById('defendantsPie');
  const ctxPop = document.getElementById('censusPie');
  const txt = document.getElementById('demoText');

  const createConfig = (data, label) => ({
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: COLORS
      }]
    },
    options: {
      plugins: {
        legend: {
          position: label === 'Defendants' ? 'right' : 'none'
        }
      }
    }
  });

  const pie1 = new Chart(ctxDef, createConfig(defData, 'Defendants'));
  const pie2 = new Chart(ctxPop, createConfig(popData, 'Population'));

  const handleHover = (index) => {
    txt.textContent = `${labels[index]} — ${defData[index].toFixed(2)}% of defendants vs ${popData[index].toFixed(2)}% of population`;
    txt.style.color = COLORS[index];
    pie1.data.datasets[0].backgroundColor = COLORS.map((c, i) => i === index ? c : DIM_COLORS[i]);
    pie2.data.datasets[0].backgroundColor = COLORS.map((c, i) => i === index ? c : DIM_COLORS[i]);
    pie1.update();
    pie2.update();
  };

  ctxDef.onmousemove = (evt) => {
    const point = pie1.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (point.length) handleHover(point[0].index);
  };

  ctxPop.onmousemove = (evt) => {
    const point = pie2.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (point.length) handleHover(point[0].index);
  };
}

loadData();
