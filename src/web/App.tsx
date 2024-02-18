import React, { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '../../public/vite.svg';
import './App.css';
import { health } from '../lib/openapi';

function App(): React.JSX.Element {
  const [count, setCount] = useState(0);
  const [version, setVersion] = useState('loading...');

  useEffect(() => {
    health().then((response) => setVersion(response.data.version));
  }, []);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
        <p>
          Edit <code>src/web/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <p>
        API Version:
        <br />
        <code>{version}</code>
      </p>
    </>
  );
}

export default App;
