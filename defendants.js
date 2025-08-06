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

async function getLatestFile() {
  const year = new Date().getFullYear();
  for (let y = year; y >= 2015; y--) {
    const res = await fetch(`${folder}defendants_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) return y;
  }
  throw new Error('No valid defendants_[year].xlsx file found.');
}

function normalizeEthnicity(raw) {
  const eth = raw.toLowerCase();
  if (eth.includes('white')) return 'White';
  if (eth.includes('black')) return 'Black or African American';
  if (eth.includes('asian')) return 'Asian';
  if (eth.includes('hispanic')) return 'Hispanic or Latino';
  if (eth.includes('american indian') || eth.includes('alaska')) return 'American Indian and Alaska Native';
  if (eth.includes('hawaiian') || eth.includes('pacific')) return 'Native Hawaiian and Other Pacific Islander';
  return null;
}

async function loadData() {
  const year = await getLatestFile();
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

  const defData = labels.map(k => (counts[k] || 0) / total * 100);
  const popData = labels.map(k => POPULATION[k] / popTotal * 100);
  const colors = labels.map((_, i) => COLORS[i % COLORS.length]);

  buildCharts(labels, defData, popData, colors);
}

function buildCharts(labels, defData, popData, colors) {
  const pie1 = new Chart(document.getElementById('pieDef'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: defData, backgroundColor: colors }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  });

  const pie2 = new Chart(document.getElementById('piePop'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: popData, backgroundColor: colors }]
    },
    options: { plugins: { legend: { display: false } } }
  });

  const txt = document.getElementById('demoText');

  const showHover = (i) => {
    txt.textContent = `${labels[i]} — ${defData[i].toFixed(2)}% of defendants vs ${popData[i].toFixed(2)}% of population`;
    txt.style.color = colors[i];
  };

  document.getElementById('pieDef').onmousemove = (evt) => {
    const point = pie1.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (point.length) showHover(point[0].index);
  };

  document.getElementById('piePop').onmousemove = (evt) => {
    const point = pie2.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (point.length) showHover(point[0].index);
  };
}

loadData();
