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

const folder = './data/';

// check for most recent available year file
async function getLatestYear() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--) {
    const head = await fetch(`${folder}defendants_${y}.xlsx`, { method: 'HEAD' });
    if (head.ok) return y;
  }
  throw new Error('No defendant file found');
}

// normalize ethnicity labels to Census race buckets
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
  const colors = labels.map((_, i) => COLORS[i % COLORS.length]);

  buildCharts(labels, defData, popData, colors);
}

function buildCharts(labels, defData, popData, colors) {
  const ctxDef = document.getElementById('pieDef');
  const ctxPop = document.getElementById('piePop');
  const txt = document.getElementById('demoText');

  const pie1 = new Chart(ctxDef, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: defData, backgroundColor: colors }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  });

  const pie2 = new Chart(ctxPop, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: popData, backgroundColor: colors }]
    },
    options: { plugins: { legend: { display: false } } }
  });

  const handleHover = (index) => {
    txt.textContent = `${labels[index]} — ${defData[index].toFixed(2)}% of defendants vs ${popData[index].toFixed(2)}% of population`;
    txt.style.color = colors[index];
  };

  ctxDef.onmousemove = (evt) => {
    const points = pie1.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (points.length) handleHover(points[0].index);
  };

  ctxPop.onmousemove = (evt) => {
    const points = pie2.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (points.length) handleHover(points[0].index);
  };
}

loadData();
