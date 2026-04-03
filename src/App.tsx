import { useEffect } from 'react';

import { AccountModalHost } from './components/account-modal-host';
import { mountLegacyApp } from './legacy/bootstrap';

export default function App() {
  useEffect(() => mountLegacyApp(), []);

  return (
    <>
      <div id="app" />
      <AccountModalHost />
    </>
  );
}
