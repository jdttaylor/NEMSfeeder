// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');
const dotenv = require('dotenv');

const app = express();
const PORT = 8081;
app.use(cors());
dotenv.config();

const feedsPath = process.env.STM_HOME
  ? path.resolve(process.env.STM_HOME)
  : path.resolve(process.env.HOME, '.stm/feeds');

const testsPath = process.env.STM_HOME
  ? path.resolve(process.env.STM_HOME)
  : path.resolve(process.env.HOME, '.stm/tests');

const BASE_URL = process.env.NEMS_SEMP_URL;
const USERNAME = process.env.NEMS_SEMP_USER;
const PASSWORD = process.env.NEMS_SEMP_PASSWORD;
const VPN = process.env.NEMS_VPN;

app.use(cors()); // Enable CORS

const api = axios.create({
  baseURL: BASE_URL,
  auth: {
    username: USERNAME,
    password: PASSWORD,
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

app.get('/feeds', (req, res) => {
  fs.readdir(feedsPath, { withFileTypes: true }, (err, entries) => {
    if(err) {
      res.status(500).json({ error: 'Failed to read directory' });
      return;
    }

    const feedPromises = entries
      .filter((entry) => entry.isDirectory())
      .map((dir) => {
        const feedInfoPath = path.join(feedsPath, dir.name, 'feedinfo.json');
        const feedRulesPath = path.join(feedsPath, dir.name, 'feedrules.json');
        const feedSessionPath = path.join(feedsPath, dir.name, 'feedsession.json');
        const feedAnalysisPath = path.join(feedsPath, dir.name, 'analysis.json');

        return new Promise((resolve) => {
          // Read feedinfo.json, feedrules.json, analysis.json and feedsession.json in parallel
          Promise.all([
            fs.promises.readFile(feedInfoPath, 'utf8').catch(() => null),
            fs.promises.readFile(feedRulesPath, 'utf8').catch(() => null),
            fs.promises.readFile(feedAnalysisPath, 'utf8').catch(() => null),
            fs.promises.readFile(feedSessionPath, 'utf8').catch(() => null),
          ]).then(([feedInfoData, feedRulesData, feedAnalysisData, feedSessionData]) => {
            if(feedInfoData || feedRulesData || feedAnalysisData || feedSessionData) {
              try {
                const feedInfo = feedInfoData ? JSON.parse(feedInfoData) : null;
                const feedRules = feedRulesData
                  ? JSON.parse(feedRulesData)
                  : null;
                const feedAnalysis = feedAnalysisData
                  ? JSON.parse(feedAnalysisData)
                  : null;
                const feedSession = feedSessionData
                  ? JSON.parse(feedSessionData)
                  : null;
                const specFilePath = path.join(
                  feedsPath,
                  dir.name,
                  feedAnalysis?.fileName || ''
                );
                fs.promises
                  .readFile(specFilePath, 'utf8')
                  .then((specFileData) => {
                    let specFile = null;
                    try {
                      specFile = JSON.parse(specFileData);
                    } catch(jsonParseError) {
                      try {
                        specFile = yaml.load(specFileData);
                      } catch(yamlParseError) {
                        specFile = null;
                      }
                    }
                    resolve({
                      directory: dir.name,
                      feedinfo: feedInfo,
                      feedrules: feedRules,
                      analysis: feedAnalysis,
                      feedsession: feedSession,
                      specFile: specFile,
                    });
                  })
                  .catch(() => {
                    resolve({
                      directory: dir.name,
                      feedinfo: feedInfo,
                      feedrules: feedRules,
                      feedsession: feedSession,
                      analysis: feedAnalysis,
                      specFile: null,
                    });
                  });
              } catch(parseError) {
                resolve(null); // Ignore parsing errors
              }
            } else {
              resolve(null); // No data found for this directory
            }
          });
        });
      });

    Promise.all(feedPromises).then((feeds) => {
      const validFeeds = feeds.filter((feed) => feed !== null);
      res.json(validFeeds);
    });
  });
});

app.get('/tests', (req, res) => {
  const testConfigPath = path.join(testsPath, 'testconfig.json');
  const testSessionPath = path.join(testsPath, 'testsession.json');

  Promise.all([
    fs.promises.readFile(testConfigPath, 'utf8').catch(() => null),
    fs.promises.readFile(testSessionPath, 'utf8').catch(() => null),
  ]).then(([testConfigData, testSessionData]) => {
    if (!testConfigData && !testSessionData) {
      return res.status(404).json({ error: 'No test files found' });
    }

    try {
      const testConfig = testConfigData ? JSON.parse(testConfigData) : null;
      const testSession = testSessionData ? JSON.parse(testSessionData) : null;

      res.json({
        testconfig: testConfig,
        testsession: testSession,
      });
    } catch (err) {
      console.error('JSON parsing error:', err);
      res.status(500).json({ error: 'Invalid JSON in one of the test files' });
    }
  });
});

app.get('/subscriptions/:queueName', async (req, res) => {
  const { queueName } = req.params;
  const url = `/SEMP/v2/config/msgVpns/${VPN}/queues/${queueName}/subscriptions`;

  try {
    const response = await api.get(url);
    const topics = response.data?.data?.map((sub) => sub.subscriptionTopic) || [];
    res.json(topics);
  } catch (err) {
    console.error('Error fetching subscriptions:', err.message);
    console.error('URL', BASE_URL);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
