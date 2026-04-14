import { createRoot } from 'react-dom/client';

import './design-tokens.css';
import './styles.css';

import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root was not found.');
}

createRoot(container).render(<App />);
