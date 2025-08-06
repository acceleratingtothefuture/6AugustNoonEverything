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

async function loadData() {
  const year = new Date().getFullYear();
  const buffer = await fetch(`${folder}defendants_${year}.xlsx`).then(r => r.arrayBuffer());
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const counts = {};
  let total = 0;

  raw.forEach(row => {
    const d = cleanDefRow(row);
    if (!d || !d.ethnicity) return;

    let eth = d.ethnicity.toLowerCase();
    if (eth.includes('white')) eth = 'White';
    else if (eth.includes('black')) eth = 'Black or African American';
    else if (eth.includes('asian')) eth = 'Asian';
    else if (eth.includes('hispanic')) eth = 'Hispanic or Latino';
    else if (eth.includes('american indian') || eth.includes('alaska')) eth = 'American Indian and Alaska Native';
    else if (eth.includes('hawaiian') || eth.includes('pacific')) eth = 'Native Hawaiian and Other Pacific Islander';
    else return;

    counts[eth] = (counts[eth] || 0) + 1;
    total++;
  });

  const defendantData = [], popData = [], labels = [], colors = [];

  Object.keys(POPULATION).forEach((eth, i) => {
    const defPct = (counts[eth] || 0) / total * 100;
    const popPct = POPULATION[eth] / Object.values(POPULATION).reduce((a, b) => a + b) * 100;
    defendantData.push(defPct);
    popData.push(popPct);
    labels.push(eth);
    colors.push(COLORS[i % COLORS.length]);
  });

  buildCharts(labels, defendantData, popData, colors);
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

  document.getElementById('pieDef').onmousemove = function (evt) {
    const point = pie1.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (!point.length) return;
    const i = point[0].index;
    txt.textContent = `${labels[i]} — ${defData[i].toFixed(2)}% of defendants vs ${popData[i].toFixed(2)}% of population`;
    txt.style.color = colors[i];
  };
  document.getElementById('piePop').onmousemove = function (evt) {
    const point = pie2.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (!point.length) return;
    const i = point[0].index;
    txt.textContent = `${labels[i]} — ${defData[i].toFixed(2)}% of defendants vs ${popData[i].toFixed(2)}% of population`;
    txt.style.color = colors[i];
  };
}

loadData();
