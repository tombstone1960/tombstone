import { english } from './localization/locale.js';
import './atlas.css';

if (english) await import('./localization/english-chapter.js');
else await import('./chapter-guide.js');
