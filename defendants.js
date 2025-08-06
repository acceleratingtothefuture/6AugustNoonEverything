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
  defendants: '#007acc',
  population: '#ff9800'
};

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

  buildBarChart(labels, defData, popData);
}

function buildBarChart(labels, defData, popData) {
  const ctx = document.getElementById('barChart');
  const txt = {
    race: document.querySelector('#demoText .race'),
    def: document.querySelector('#demoText .def'),
    pop: document.querySelector('#demoText .pop')
  };

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Defendants',
          data: defData,
          backgroundColor: COLORS.defendants
        },
        {
          label: 'Population',
          data: popData,
          backgroundColor: COLORS.population
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          enabled: false
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: value => `${value}%`
          }
        }
      },
      onHover: (e, elements) => {
        if (!elements.length) return;
        const i = elements[0].index;
        txt.race.textContent = labels[i];
        txt.def.innerHTML = `<span style="color:${COLORS.defendants}">${defData[i].toFixed(2)}% of defendants</span>`;
        txt.pop.innerHTML = `<span style="color:${COLORS.population}">${popData[i].toFixed(2)}% of population</span>`;
      }
    }
  });
}

loadData();
