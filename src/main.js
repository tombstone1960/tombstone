import './atlas.css';
import { mountNationalMap } from './national-map.js';

mountNationalMap(document.querySelector('#atlas')).catch(error => {
  document.querySelector('#atlas-loading').textContent = '地图没能加载。你仍可以在地方档案里查看记录。';
  console.error('National map failed to load:', error);
});
