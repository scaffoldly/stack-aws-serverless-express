import React, { useEffect, useState } from 'react';
import serverlessLogo from '../../public/serverless.svg';
import reactLogo from './assets/react.svg';
import expressjsLogo from '../../public/expressjs.svg';
import scaffoldlyLogo from '../../public/scaffoldly.svg';
import './App.css';
import { health } from '../lib/api';

function App(): React.JSX.Element {
  const [count, setCount] = useState(0);
  const [version, setVersion] = useState('loading...');

  useEffect(() => {
    health().then((response) => setVersion(response.data.version));
  }, []);

  return (
    <>
      <div>
        <a href="https://serverless.com" target="_blank">
          <img src={serverlessLogo} className="logo" alt="Serverless logo" />
        </a>
        <a href="https://expressjs.com" target="_blank">
          <img src={expressjsLogo} className="logo" alt="ExpressJS logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo" alt="React logo" />
        </a>
      </div>
      <h1>Serverless + Express + React</h1>
      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
        <p>
          Edit <code>src/api/index.ts</code> and save to modify ESBuild+Express
          API
        </p>
        <p>
          Edit <code>src/web/App.tsx</code> and save to modify Vite+React
          Frontend
        </p>
        <p>
          Open{' '}
          <a href="api/swagger.html" target="_blank">
            Swagger
          </a>{' '}
          to explore this project's OpenAPI
        </p>
      </div>
      <p>
        API Version:
        <br />
        <code>{version}</code>
      </p>
      <div>
        <a href="https://scaffoldly.dev" target="_blank">
          <img src={scaffoldlyLogo} className="logo" alt="Scaffoldly logo" />
        </a>
      </div>
    </>
  );
}

export default App;
