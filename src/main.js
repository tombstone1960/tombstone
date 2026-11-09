import './atlas.css';
import { mountNationalMap } from './national-map.js';
import { localText as t } from './localization/locale.js';

mountNationalMap(document.querySelector('#atlas')).catch(error => {
  document.querySelector('#atlas-loading').textContent = t('地图未能加载。可到「地方记录」页查看。', 'The map could not load. You can still browse the reading guides.');
  console.error('National map failed to load:', error);
});
