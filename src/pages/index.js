import React, { useEffect, useReducer, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, InputGroup } from 'react-bootstrap';
import Layout from '../components/layout';
import SEO from '../components/seo';
import FeedCard from '../components/feedCard';
import Loading from '../components/loading';
import Contribution from '../components/contribution';
import ContributionSteps from '../components/contributionSteps';
import { TestCommunityFeeds, TestLocalFeeds } from '../util/helpers/testFeeds';
import { ClearOutlined, SettingOutlined } from '@ant-design/icons';
import { Tooltip, Button } from 'antd';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import SettingsModal from '../modals/settings';
import { Toaster } from 'react-hot-toast';

const initialState = {
  isLoading: true,
  communityFeeds: [],
  localFeeds: [],
  manualTests:[],
  hostname: '',
  isLocal: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_FEEDS':
      return { ...state, communityFeeds: action.payload };
    case 'SET_LOCAL_FEEDS':
      return { ...state, localFeeds: action.payload };
    case 'SET_MANUAL_TESTS':
      return { ...state, manualTests: action.payload};
    case 'SET_HOSTNAME':
      return { ...state, hostname: action.payload };
    case 'SET_LOCAL':
      return { ...state, isLocal: action.payload };
    default:
      return state;
  }
};

const IndexPage = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [search, setSearch] = useState('');
  const modal = useModal(SettingsModal);

  const isLocal =
    state.hostname === 'localhost' ||
    state.hostname === '127.0.0.1' ||
    state.hostname.startsWith('192.168.') ||
    state.hostname.startsWith('localhost') ||
    state.hostname.startsWith('10.');

  const launchSettings = () => {
    modal.show();
  };

  useEffect(() => {
    const fetchFeeds = async () => {
      var feedsData = await axios.get(
        'https://raw.githubusercontent.com/solacecommunity/solace-event-feeds/main/EVENT_FEEDS.json'
      );
      feedsData = feedsData.data.filter((feed) => feed.type !== 'restapi_feed');
      // sort FeedsData by feedsData.name
      feedsData.sort((a, b) => a.name.localeCompare(b.name));

      // for local testing only //
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      // feedsData = TestCommunityFeeds.filter((feed) => feed.type !== 'restapi_feed');
      // dispatch({ type: 'SET_FEEDS', payload: TestCommunityFeeds });
      // for local testing only //

      dispatch({ type: 'SET_FEEDS', payload: feedsData });
      dispatch({ type: 'SET_LOCAL', payload: isLocal });

      if (isLocal) {
        console.log('Running local UI');
        try {
          const feeds = await axios.get('http://127.0.0.1:8081/feeds');
          let localFeeds = [];

          feeds.data.forEach((localFeed) => {
            localFeeds.push(localFeed.feedinfo);
          });
          localFeeds = localFeeds.filter(
            (feed) => feed.type !== 'restapi_feed'
          );

          dispatch({ type: 'SET_LOCAL_FEEDS', payload: localFeeds });
        } catch (error) {
          console.error('Failed to fetch local feeds:', error);
          dispatch({ type: 'SET_LOCAL', payload: [''] });
        }
        // dispatch({ type: 'SET_LOCAL_FEEDS', payload: TestLocalFeeds });
      }
      
      try {
        const tests = await axios.get('http://127.0.0.1:8081/tests');
        let manualTests =[];
        
        manualTests = tests.data.testconfig.testinfo;

        dispatch({ type: 'SET_MANUAL_TESTS', payload: manualTests });
      } catch (error) {
        console.error('Failed to fetch manual tests:', error);
      }

      dispatch({ type: 'SET_LOADING', payload: false });
    };

    if (typeof window !== 'undefined') {
      dispatch({ type: 'SET_HOSTNAME', payload: window.location.hostname });
    }

    fetchFeeds();
  }, [state.hostname]);

  return (
    <NiceModal.Provider>
      <Toaster position="bottom-center" reverseOrder={false} />
      <Layout>
        <SEO title="National Event Mangement Service" />
        <section id="intro">
          <Container className="pt6 pb5">
            <Row className="tc">
              <Col>
                <h1>National Event Mangement Service</h1>
                <p>
                  The National Event Management Service site provides a testing
                  platform making it easy to start publishing streams of events to the{' '}
                  <a
                    href="https://www.tewhatuora.govt.nz/health-services-and-programmes/digital-health/connected-health"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    NEMS Test Event Broker
                  </a>
                  . Each test contains sample requests for the events which includes payloads
                  topic taxnonmy and headers. This allows publishers and subscribers to become familar 
                  with the NEMS platform and try connecting their own environment as required. 
                </p>
              </Col>
            </Row>
          </Container>
        </section>

        <section id="feeds-section">
          {/* {state.isLoading ? (
            <Loading section="Digital Service Events" />
          ) : (
            <Container className="pb5">
              <Row className="mt3">
                <Col
                  xs={5}
                  sm={5}
                  md={5}
                  lg={5}
                  xl={5}
                  xxl={5}
                  className="mt3 mb3"
                >
                  <InputGroup className="mt3 mb3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search Digital Services Events..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <Tooltip title="Clear search">
                      <Button
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                        }}
                        onClick={(e) => setSearch('')}
                        icon={<ClearOutlined />}
                      />
                    </Tooltip>
                    <Tooltip title="Settings">
                      <Button
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                        }}
                        onClick={(e) => launchSettings()}
                        icon={<SettingOutlined />}
                      />
                    </Tooltip>
                  </InputGroup>
                </Col>
              </Row>
              <h2 className="mt4">Digital Service Events</h2>
              <Row className="mt3">
                {state.communityFeeds
                  .filter((item) => {
                    if (search.toLowerCase() === '') {
                      return item;
                    } else {
                      return (
                        item.name
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        item.domain.toLowerCase().includes(search.toLowerCase())
                      );
                    }
                  })
                  .map((feed, index) => (
                    <Col
                      key={index}
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      xl={4}
                      xxl={3}
                      className="mt3 mb3"
                    >
                      <FeedCard feed={feed} index={index} isLocal={false} />
                    </Col>
                  ))}
              </Row>
            </Container>
          )} */}

          { state.isLoading ? (
  <Loading section="Digital Service Events" />
) : (
            <Container className="pb5">
              <Row className="mt3">
                <Col
                  xs={5}
                  sm={5}
                  md={5}
                  lg={5}
                  xl={5}
                  xxl={5}
                  className="mt3 mb3"
                >
                  <InputGroup className="mt3 mb3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search NEMS Events..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <Tooltip title="Clear search">
                      <Button
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                        }}
                        onClick={(e) => setSearch('')}
                        icon={<ClearOutlined />}
                      />
                    </Tooltip>
                    <Tooltip title="Settings">
                      <Button
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                        }}
                        onClick={(e) => launchSettings()}
                        icon={<SettingOutlined />}
                      />
                    </Tooltip>
                  </InputGroup>
                </Col>
              </Row>
              <h2 className="mt4">NEMS Events</h2>
              {state.localFeeds.length > 0 ? (
              <Row>
                {state.localFeeds
                    .filter((feed) => {
                  if (search.toLowerCase() === '') {
                    return feed;
                  } else {
                    return (
                      feed.name
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                      feed.domain.toLowerCase().includes(search.toLowerCase())
                    );
                  }
                })
                  .map((feed, index) => (
                    <Col
                      key={index}
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      xl={4}
                      xxl={3}
                      className="mt3 mb3"
                    >
                      <FeedCard feed={feed} index={index} isLocal={true} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <div>
                  No Events found. Generate a local feed using the steps
                  below
                </div>
              )}
            </Container>
)
          }
          {state.isLoading ? (
            <Loading section="Manual Events" />
          ) : (
            <Container className="pb5">
              <h2 className="mt4">Manual Tests</h2>
              <Row className="mt3">
                {state.manualTests
                  .map((test, index) => (
                    <Col
                      key={index}
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      xl={4}
                      xxl={3}
                      className="mt3 mb3"
                    >
                      <FeedCard feed={test} index={index} isLocal={false} />
                    </Col>
                  ))}
              </Row>
            </Container>
          )} 
        </section>

         {<section id="contribute">
          <Container className="pt6 pb5" hidden={true}>
            <h1>How to Contribute</h1>
            <br />
            <br />
            <br />
            <Row>
              {/* <Col>
              <ContributionSteps />
            </Col> */}
              <Col>
                <Contribution />
              </Col>
            </Row>
          </Container>
        </section> }
      </Layout>
    </NiceModal.Provider>
  );
};

export default IndexPage;
