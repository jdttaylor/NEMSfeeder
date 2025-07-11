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

const factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10_5;
SolclientFactory.init(factoryProps);
SolclientFactory.setLogLevel(solace.LogLevel.DEBUG);

const BrokerConfig = (props) => {
  const { session, setSession, setSessionProperties, isAnyEventRunning } =
    useContext(SessionContext); // Use context
  const [isConnected, setIsConnected] = useState(session ? true : false);
  const [connecting, setConnecting] = useState(false);
  const [errorConnection, setErrorString] = useState(undefined);
  const [disableForm, setdisableForm] = useState(false);
  const [form] = Form.useForm();
  const [record, setRecord] = useState({
    url: 'wss://default.messaging.solace.cloud:443',
    vpn: 'default',
    username: 'default',
    password: 'default',
    clientname: `stm_feed_web_${Math.random().toString(16).substring(2, 10)}`,
    qos: 'direct',
    msgformat: 'text',
    compression: false,
  });

  useEffect(() => {
    const feedSession = props.feedSession;
    if(feedSession && Object.keys(feedSession).length > 0) {
      setRecord((prevRecord) => ({
        ...prevRecord,
        clientname: feedSession.clientName?.value || prevRecord.clientname,
        includeSenderId: feedSession.includeSenderId?.value === 'true' || prevRecord.includeSenderId,
        applicationDescription: feedSession.applicationDescription?.value || prevRecord.applicationDescription,
        generateSendTimestamps: feedSession.generateSendTimestamps?.value === 'true' || prevRecord.generateSendTimestamps,
        compression: feedSession.compression?.value === 'true' || prevRecord.compression,
        qos: (feedSession.deliveryMode?.value || prevRecord.qos).toLowerCase(),
        msgformat: (feedSession.messageFormat?.value || prevRecord.msgformat).toLowerCase(),
      }));

      // Explicitly set the form values, as the initialValues prop is not reactive
      form.setFieldsValue({
        qos: (feedSession.deliveryMode?.value || record.qos).toLowerCase(),
        msgformat: (feedSession.messageFormat?.value || record.msgformat).toLowerCase(),
      });
    }
  }, [props.feedSession]);

  useEffect(() => { }, [session, record]);

  const onRecordChange = (value) => {
    setRecord((prevRecord) => ({ ...prevRecord, ...value }));
  };

  const handleConnect = (e) => {
    console.log('Connecting to the solace broker...');
    const { url, vpn, username, password, compression, clientname, includeSenderId, generateSendTimestamps, applicationDescription, qos } = record;

    let sessionProperties;
    try {
      new URL(url); // Validate URL
      sessionProperties = {
        url: url,
        vpnName: vpn,
        userName: username,
        password: password,
        clientName: clientname,
        applicationDescription: applicationDescription,
        generateSendTimestamps: generateSendTimestamps,
        includeSenderId: includeSenderId,
        connectRetries: 0,
        reconnectRetries: 3,
        compressionLevel: compression ? 9 : 0,
        publisherProperties: {
          enabled: qos === 'guaranteed' ? true : false
        }
      };
    } catch(error) {
      setErrorString('Invalid URL: ' + url);
      setConnecting(false);
      return;
    }

    setConnecting(true);
    const newSession = solace.SolclientFactory.createSession(sessionProperties);

    newSession.on(solace.SessionEventCode.UP_NOTICE, () => {
      console.log('Connected to Solace message router.');
      setErrorString(undefined);
      setIsConnected(true);
      setConnecting(false);
      setdisableForm(true);
      setSession(newSession);
      setSessionProperties({
        qos: record.qos,
        msgformat: record.msgformat,
        compression: record.compression,
        includeSenderId: record.includeSenderId,
        applicationDescription: record.applicationDescription,
        generateSendTimestamps: record.generateSendTimestamps,
        clientname: record.clientname,
      });
    });

    newSession.on(
      solace.SessionEventCode.CONNECT_FAILED_ERROR,
      (sessionEvent) => {
        console.log(
          'Connection failed to the message router: ' + sessionEvent.infoStr
        );
        setErrorString(
          `${sessionEvent.infoStr}: Check broker connection details. Also, if using Brave/Safari, take "shields" down to allow connection.`
        );
        setIsConnected(false);
        setConnecting(false);
        setdisableForm(false);
      }
    );

    newSession.on(solace.SessionEventCode.DISCONNECTED, () => {
      console.log('Disconnected From broker.');
      setIsConnected(false);
      setConnecting(false);
      setdisableForm(false);
      setSession(null);
    });

    try {
      newSession.connect();
    } catch(error) {
      setErrorString(
        'Error connecting to Solace message router: ',
        error.toString()
      );
    }
  };

  const handleDisconnect = () => {
    if(session) {
      try {
        console.log('Disconnecting Solace session.');
        session.removeAllListeners();
        session.disconnect();
        setIsConnected(false);
        setConnecting(false);
      } catch(error) {
        setErrorString(
          'Error disconnecting from Solace message router: ',
          error.toString()
        );
      }
    }
  };

  const handleDownload = () => {
    const config = {
      url: record.url,
      vpn: record.vpn,
      username: record.username,
      password: record.password,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feeds-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        handleConnect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [record]);
  const ConnectionForm = (
    <>
      <Form
        layout="vertical"
        form={form}
        name="basic"
        disabled={disableForm}
        initialValues={record}
        onValuesChange={onRecordChange}
      >
        <Row gutter={20}>
          <Col span={6}>
            <Form.Item
              label="URL"
              name="url"
              hidden={true}
              rules={[
                {
                  required: true,
                  message: 'Please input the URL',
                },
                {
                  type: 'url',
                  message: 'Please enter a valid URL',
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              label="VPN" 
              name="vpn"
              hidden={true}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              label="Username" 
              name="username"
              hidden={true}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              label="Password" 
              name="password"
              hidden={true}>
              <Input.Password />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Quality of Service" name="qos">
              <Radio.Group>
                <Radio value="direct">Direct</Radio>
                <Radio value="guaranteed" checked>Guaranteed</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Message Format" name="msgformat">
              <Radio.Group>
                <Radio value="text">Text Message</Radio>
                <Radio value="bytes">Bytes Message</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={1}></Col>
          <Col span={3}>
            <Form.Item>
              <Button
                type="primary"
                shape="round"
                onClick={handleConnect}
                disabled={isConnected}
              >
                {connecting
                  ? 'Connecting...'
                  : isConnected
                    ? 'Connected'
                    : 'Connect'}
              </Button>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item>
              <Button
                color="danger"
                variant="solid"
                shape="round"
                onClick={handleDisconnect}
                disabled={!isConnected || isAnyEventRunning}
              >
                Disconnect
              </Button>
            </Form.Item>
          </Col>

          <Form.Item>
            <Col span={2}>
              <Tooltip title="Download config">
                <Button
                  type="primary"
                  shape="round"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  style={{ padding: '10px' }}
                  disabled={false}
                ></Button>
              </Tooltip>
            </Col>
          </Form.Item>
          <Col span={1}>
            <Form.Item>
              <Tooltip title="Upload config">
                <Button
                  type="primary"
                  shape="round"
                  icon={<UploadOutlined />}
                  style={{ padding: '10px' }}
                  onClick={() => document.getElementById('fileInput').click()}
                ></Button>
              </Tooltip>
              <input
                type="file"
                id="fileInput"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const config = JSON.parse(event.target.result);
                      if(
                        typeof config !== 'object' ||
                        !config.url ||
                        !config.vpn ||
                        !config.username ||
                        !config.password
                      ) {
                        throw new Error('Invalid configuration file format.');
                      }
                      setRecord(config);
                      form.setFieldsValue(config);
                    } catch(error) {
                      let errorString = 'Error parsing config file: ' + error;
                      setErrorString(errorString);
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </Form.Item>
          </Col>
          {errorConnection && (
            <Col span={24}>
              <Form.Item>
                <div style={{ color: 'red' }}>{errorConnection}</div>
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
      <Row>
        <Col span={24}>
          <Form.Item>
            <div>
              To get started creating a connection to the NEMS broker follow
              the instructions on{' '}
              <a
                href="https://docs.solace.com/Get-Started/Getting-Started-Try-Broker.htm"
                target="_blank"
              >
                Try PubSub+ Event Brokers
              </a>{' '}
              page.
            </div>
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  const Label = (
    <>
      <Tooltip
        title={isConnected ? 'Connected to Broker' : 'Disconnected to Broker'}
      >
        <LinkOutlined
          style={{
            padding: '10px',
            color: isConnected ? 'green' : 'red',
          }}
        />
      </Tooltip>
      Configure Broker
    </>
  );

  return (
    <div>
      <Collapse
        items={[
          {
            key: 'config',
            label: Label,
            children: ConnectionForm,
          },
        ]}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined
            style={{ fontSize: '20px', padding: '15px 0 0 0' }}
            rotate={isActive ? 90 : 0}
          />
        )}
        size="medium"
        defaultActiveKey={['config']}
      />
    </div>
  );
};

export default BrokerConfig;
