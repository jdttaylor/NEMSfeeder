import React, { useEffect, useReducer } from 'react';
import axios from 'axios';
import Layout from '../components/layout';
import SEO from '../components/seo';
import Loading from '../components/loading';
import BrokerConfig from '../components/brokerConfig';
import PublishEvents from '../components/publishEvents';
import SubscribeEvents from '../components/subscribeEvents';
import TopicConfig from '../components/topicConfig';
import CustomEvent from '../components/customEvent';
import { Container, Row, Col } from 'react-bootstrap';
import { SolaceSession } from '../util/helpers/solaceSession';
import ExportEPModal from '../modals/export';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { Toaster } from 'react-hot-toast';

const testMetadata = {
  fakerRules: [],
  testInfo: [],
  feedRules: [],
  // For AsyncAPI feeds
  analysis: [],
  testSession: [],
  feedSchemas: [],
  specFile: [],
  // For REST API feeds
  feedAPI: [],
  specFileURL: '',
};

const reducer = (state, action) => {
  switch(action.type) {
    case 'SET_FAKER_RULES':
      return { ...state, fakerRules: action.payload };
    case 'SET_SPEC_FILE':
      return { ...state, specFile: action.payload };
    case 'SET_SPEC_FILE_URL':
      return { ...state, specFileURL: action.payload };
    case 'SET_TEST_INFO':
      return { ...state, testInfo: action.payload };
    case 'SET_TEST_RULES':
      return { ...state, feedRules: action.payload };
    case 'SET_ANALYSIS':
      return { ...state, analysis: action.payload };
    case 'SET_TEST_SESSION':
      return { ...state, testSession: action.payload };
    case 'SET_TEST_SCHEMAS':
      return { ...state, feedSchemas: action.payload };
    case 'SET_TEST_API':
      return { ...state, feedAPI: action.payload };
    default:
      return state;
  }
};

const TestPage = ({ location }) => {
  const [state, dispatch] = useReducer(reducer, testMetadata);
  // for local testing only //
  // const [state, dispatch] = useReducer(reducer, TestFeedMetadata);

  const params = new URLSearchParams(location.search);
  const test = {
    name: params.get('name') || '',
    isLocal: params.get('isLocal') || false,
    type: params.get('type') || '',
  };
  const modal = useModal(ExportEPModal);
  const openExportModal = () => {
    modal.show({ specFile: state.specFile });
  };
  const downloadSpecFile = () => {
    const blob = new Blob([JSON.stringify(state.specFile, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.specFile.info.title.replace(/ /g, '_') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {

    const fetchTestInfo = async () => {
      const tests = await axios.get('http://127.0.0.1:8081/tests');
      console.log(tests);

      const testInfoList = tests.data.testconfig?.testinfo || [];

      const testDetails = testInfoList.find(
        (t) => t.name.toLowerCase() === test.name.toLowerCase()
      );
      dispatch({ type: 'SET_TEST_INFO', payload: testDetails });

    };

    fetchTestInfo();

  }, []);

  return (
    <NiceModal.Provider>
      <Toaster position="bottom-center" reverseOrder={false} />
      <Layout>
        <SEO title={`${test.name} Test Harness`} />
        <section id="intro">
          <Container className="pt6 pb3">
            <Row className="tc">
              <Col>
                <h1>{test.name.replace(/_/g, ' ')}</h1>
                {state.testInfo.length === 0 ? (
                  <Loading section="Description" />
                ) : (
                  <div>{state.testInfo.description}</div>
                )}
              </Col>
            </Row>
          </Container>
        </section>
        <SolaceSession>
          <Container className="pb5">
            <Row className="mt3">
              <BrokerConfig testSession={state.testSession} />
            </Row>

            {test.type === 'asyncapi_feedXX' ? (
              state.feedRules.length === 0 ? (
                <Loading section="Events" />
              ) : (
                <Row className="mt3">
                  <PublishEvents testRules={state.feedRules} />
                </Row>
              )
            ) : test.type === 'restapi_feed' ? (
              state.feedAPI.length === 0 ? (
                <Loading section="Events" />
              ) : (
                <Row className="mt3">
                  <p> REST APIs Not yet supported</p>
                </Row>
              )
            ) : null}
            {test.name.toLowerCase() === 'publisher' ? (
                <Row className="mt3">
                    <TopicConfig />
                </Row>
            ) : null}

            {test.name.toLowerCase() === 'publisher' ? (
                <Row className="mt3">
                    <SubscribeEvents />
                </Row>
            ) : null}
            {test.name.toLowerCase() === 'subscriber' ? (
                <Row className="mt3">
                    <CustomEvent />
                </Row>
            ) : null}
            {/* <Row className="mt3">
            <TopicTester testData={}/>
          </Row> */ }
         </Container>
        </SolaceSession>
      </Layout>
    </NiceModal.Provider>
  );
};

export default TestPage;