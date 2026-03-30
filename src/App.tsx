import { useEffect } from 'react';

import { mountLegacyApp } from './legacy/bootstrap';

export default function App() {
  useEffect(() => mountLegacyApp(), []);

  return <div id="app" />;
}
