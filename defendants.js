import { cleanDefRow } from './cleanData.js';

const POPULATION = {
  'Hispanic or Latino': 153027,
  'White': 16813,
  'Black or African American': 4362,
  'Asian': 3049,
  'American Indian and Alaska Native': 4266,
  'Native Hawaiian and Other Pacific Islander': 165
};

const COLORS = ['#007acc', '#ff9800'];

const folder = './data/';

async function getLatestYear() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--) {
    const head = await fetch(`${folder}defendants_${y}.xlsx`, { method: 'HEAD' });
    if (head.ok) return y;
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

  buildChart(labels, defData, popData);
}

function buildChart(labels, defData, popData) {
  const ctx = document.getElementById('barChart');
  const txt = document.getElementById('demoText');

  const chart = new Chart(ctx, {
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
          label: 'Population',
          data: popData,
          backgroundColor: COLORS[1]
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          enabled: false,
          external: context => {
            const point = context.tooltip.dataPoints?.[0];
            if (!point) return;
            const i = point.dataIndex;
            const label = labels[i];
            const defPct = defData[i].toFixed(2);
            const popPct = popData[i].toFixed(2);
            txt.textContent = `${label} — ${defPct}% of defendants vs ${popPct}% of population`;
            txt.style.color = point.dataset.backgroundColor;
          }
        }
      },
      scales: {
        x: {
          ticks: { callback: val => val + '%' },
          max: Math.max(...defData, ...popData) + 5
        }
      },
      onHover: (evt, el) => {
        const chartEls = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        const index = chartEls[0]?.index;

        chart.data.datasets.forEach((ds, dsi) => {
          ds.backgroundColor = ds.data.map((_, i) =>
            i === index ? COLORS[dsi] : '#e0e0e0'
          );
        });

        chart.update('none');
      }
    }
  });
}

loadData();
