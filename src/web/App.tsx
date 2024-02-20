import React, { useEffect, useState } from 'react';
import serverlessLogo from '../../public/serverless.svg';
import reactLogo from './assets/react.svg';
import expressjsLogo from '../../public/expressjs.svg';
import scaffoldlyBuilt from '../../public/scaffoldly-built.svg';
import './App.css';
import { health, incrementCount, getCount } from '../lib/api';

function App(): React.JSX.Element {
  const [count, setCount] = useState(0);
  const [openApiDocs, setOpenApiDocs] = useState<string>();

  useEffect(() => {
    health().then((response) =>
      setOpenApiDocs(response.data.hrefs.openApiDocs),
    );
    getCount().then((response) => setCount(response.data.count || 0));
  }, []);

  const increment = (): void => {
    incrementCount().then((response) => setCount(response.data.count));
  };

  return (
    <>
      <div>
        <a href="https://serverless.com" target="_blank" rel="noreferrer">
          <img src={serverlessLogo} className="logo" alt="Serverless logo" />
        </a>
        <a href="https://expressjs.com" target="_blank" rel="noreferrer">
          <img src={expressjsLogo} className="logo" alt="ExpressJS logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo" alt="React logo" />
        </a>
      </div>
      <h1>Serverless + Express + React</h1>
      <h4>powered by</h4>
      <h2>
        <strong>
          GitHub Codespaces + Localstack + AWS Lambda + DynamoDB + OpenAPI
        </strong>
      </h2>
      <h5>supercharged with</h5>
      <h3>
        <strong>
          Websockets + DynamoDB Events + SQS Queues + SNS Topics + S3 Events
        </strong>
      </h3>
      <div>
        <a href="https://scaffoldly.dev" target="_blank" rel="noreferrer">
          <img
            src={scaffoldlyBuilt}
            className="built-with"
            alt="Built with Scaffoldly"
          />
        </a>
      </div>
      <div className="card">
        <button type="button" onClick={() => increment()}>
          count is {count}
        </button>
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
          {openApiDocs ? (
            <a href={openApiDocs} target="_blank" rel="noreferrer">
              Swagger
            </a>
          ) : (
            <code>Loading...</code>
          )}{' '}
          to see OpenAPI Docs for this project
        </p>
      </div>
    </>
  );
}

export default App;
