import React, { useState, useEffect, useContext } from 'react';
import '../css/collapsable.css';
import { Row, Col, Form, Input, Button, Radio, Tooltip, Collapse } from 'antd';
import {
  UploadOutlined,
  CaretRightOutlined,
  LinkOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import solace, { SolclientFactory } from 'solclientjs';
import { SessionContext } from '../util/helpers/solaceSession';

const TopicConfig = (props) => {
  const {
    session,
    sessionProperties,
    isAnyEventRunning,
    setIsAnyEventRunning,
    setStreamedEvents,
  } = useContext(SessionContext); // Use context

  const [errorConnection, setErrorString] = useState(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [disableForm, setdisableForm] = useState(false);
  const [form] = Form.useForm();
  const events = {};
  const [activeEvents, setActiveEvents] = useState(events); // Track the active event
  const [topicInput, setTopicInput] = useState('');
  const [subscribedTopic, setSubscribedTopic] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(false);

  useEffect(() => {
    setIsConnected(session ? true : false);
    setIsAnyEventRunning(
      Object.values(activeEvents).some((event) => event.active)
    );
  }, [session, activeEvents]); // This will run every time 'session' is updated

  const handleDisconnect = () => {
    if (session) {
      try {
        console.log('Disconnecting Solace session.');
        session.removeAllListeners();
        session.disconnect();
        console.log('Disconnected from Solace message router.');
      } catch (error) {
        console.log(
          'Error disconnecting from Solace message router: ',
          error.toString()
        );
        setErrorString(
          'Error disconnecting from Solace message router: ',
          error.toString()
        );
      }
    }
  };

  const subscribeToTopic = () => {
    if (!session || !topicInput.trim()) {
      setSubscriptionStatus('Invalid session or topic');
      return;
    }
   
    session.subscribe(
      solace.SolclientFactory.createTopicDestination(topicInput),
      true,  // wait for confirmation
      topicInput,  // correlation key
      10000,  // timeout in ms
    );

    setSubscribedTopic(topicInput);
    setSubscriptionStatus(true);
  };

  const unsubscribeFromTopic = () => {
    if (!session || !subscribedTopic) {
      setSubscriptionStatus('No active subscription');
      return;
    }

    session.unsubscribe(
      solace.SolclientFactory.createTopicDestination(subscribedTopic),
      true,
      subscribedTopic,
      10000
    );

    setSubscriptionStatus(false);
    setSubscribedTopic('');
  };

  const Topics = (
  <div>
    <div
      style={{
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        paddingLeft: '10px',
      }}
    >
      <Button
        color="danger"
        variant="filled"
        shape="round"
        onClick={handleDisconnect}
        disabled={!isConnected || isAnyEventRunning}
      >
        {' '}
        Disconnect Broker{' '}
      </Button>
    </div>
    {errorConnection && (
      <div style={{ color: 'red', fontSize: '15px' }}>{errorConnection}</div>
    )}

  <div>
  <Form
  layout="vertical"
  form={form}
  name="basic"
  //disabled={disableForm}
>
  <Row gutter={20}>
    <Col span={10}>
      <Form.Item
        label="Topic"
        name="topic"
        value={topicInput}
        onChange={(e) => setTopicInput(e.target.value)}
      >
        <Input disabled={subscriptionStatus} />
      </Form.Item>
    </Col>
    <Col span={1}></Col>
    <Col span={3}>
      <Form.Item label="&nbsp;">
        <Button
          type="primary"
          shape="round"
          onClick={subscribeToTopic}
          disabled={subscriptionStatus || !topicInput}
        >
          {subscriptionStatus
            ? 'Subscribed'
            : 'Subscribe'}
        </Button>
          </Form.Item>
    </Col>
    <Col span={3}>
      <Form.Item label="&nbsp;">
        <Button
          type="primary"
          shape="round"
          color="danger"
          variant="solid"
          onClick={unsubscribeFromTopic}
          disabled={!subscriptionStatus}
        >
          Unsubscribe
        </Button>
          </Form.Item>
    </Col>
  </Row>
    </Form>
    </div>
    </div>
);

return (
  <div>
    <Collapse
      items={[
        {
          key: 'events',
          label: 'Topic Subscription',
          children: Topics,
        },
      ]}
      expandIcon={({ isActive }) => (
        <CaretRightOutlined
          style={{ fontSize: '20px', padding: '15px 0 0 0' }}
          rotate={isActive ? 90 : 0}
        />
      )}
      size="medium"
    />
  </div>
);
};

export default TopicConfig;