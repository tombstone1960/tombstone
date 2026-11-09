import './atlas.css';
import { mountNationalMap } from './national-map.js';

mountNationalMap(document.querySelector('#atlas')).catch(error => {
  document.querySelector('#atlas-loading').textContent = '地图未能加载。可到「地方记录」页查看。';
  console.error('National map failed to load:', error);
});
