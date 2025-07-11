import React, { useState, useEffect, useContext, useRef } from 'react';
import { InputGroup } from 'react-bootstrap';
import { SessionContext } from '../util/helpers/solaceSession';
import { Button, Form, Row, Col, Input, List, Tag, Collapse, Select, message, Modal, Tooltip} from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import Highlighter from 'react-highlight-words';
import solace, { SolclientFactory } from 'solclientjs';
import TopicSelector from './topicSelector';
import {
  CopyOutlined,
  CaretRightOutlined,
  ClearOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const MAX_RENDERED_EVENTS = 100;

const CustomEvent = () => {
  const { streamedEvents, setStreamedEvents, session, isAnyEventRunning,
    setIsAnyEventRunning } =
    useContext(SessionContext);
  const [showAllPayloads, setShowAllPayloads] = useState(false);
  const [showPayload, setShowPayload] = useState(null);
  const scrollableDivRef = useRef(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  const [activeEvents, setActiveEvents] = useState(''); // Track the active event
  const [isConnected, setIsConnected] = useState(false);
  const [queueName, setQueueName] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleCopy = (value) => {
    navigator.clipboard.writeText(JSON.stringify(value.payload, null, 2));
    message.success(`${value.eventName} Payload Copied!`);
  };

  useEffect(() => {
    setIsConnected(session ? true : false);
    setIsAnyEventRunning(
      Object.values(activeEvents).some((event) => event.active)
    );
  }, [session, activeEvents]); // This will run every time 'session' is updated

  useEffect(() => {
    if (scrollableDivRef.current) {
      scrollableDivRef.current.scrollTop =
        scrollableDivRef.current.scrollHeight;
    }

    if (streamedEvents.length > MAX_RENDERED_EVENTS) {
      setStreamedEvents(streamedEvents.slice(MAX_RENDERED_EVENTS));
    }
  }, [streamedEvents]);

  const handleSubmitCustomEvent = (values) => {

    const topic = values.topic;
    console.log('Topic selected:', topic);
    const headers = values.headers ? JSON.parse(values.headers) : {};
    let payload = "";

    if (!values.payload.trim().startsWith('[')) {
        
        payload = values.payload;

        publishEvent(topic,headers,payload);

    } else {
        try {
            const parsedArray = JSON.parse(values.payload);
        
            parsedArray.forEach((item, index) => {
              if (!item.payload) {
                message.error("Item at index ${index} is missing 'payload' property. Skipping.");
                return;
              }
        
              payload = item.payload;
        
              publishEvent(topic, headers, payload);
            });

          } catch (error) {
            console.error("Failed to parse or process payload array:", error.message);
          }
    }

  }

  const publishEvent = (topic, headers, payload) => {

    try {

      if (!session|| !isConnected) {
        console.error('Solace session is not connected');
        return;
      }
  
      const event = SolclientFactory.createMessage();;
      event.setDestination(solace.SolclientFactory.createTopicDestination(topic));
      // Set message payload
      event.setBinaryAttachment(JSON.stringify(payload));
  
      // Set headers as user properties
      let propertyMap = new solace.SDTMapContainer();
      Object.entries(headers).forEach(([key, value]) => {
        propertyMap.addField(key, solace.SDTField.create(solace.SDTFieldType.STRING, value));
        console.log(`Key: ${key}, Value:`, value)
      });

      event.setUserPropertyMap(propertyMap);
      event.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
  
      // Send the message
      session.send(event);
      message.success({
        content: `Message sent to topic: ${topic}`,
        style: {
          marginTop: '50vh',
        },
        duration: 2,
        }); 
    } catch (err) {
      message.error({
        content: `Message failed to send: ${err}`,
        style: {
          marginTop: '50vh',
        },
        duration: 2,
        });
        console.log('Message failed to send:',err);
    }
  };

  const CustomEvents = (
    <div>
  
      <Form
        layout="vertical"
        form={form}
        name="custom-event"
        onFinish={handleSubmitCustomEvent}
      >
         
        <Row gutter={20}>
          <Col span={16}>
           
            <TopicSelector />
            <Form.Item
              label="Headers (JSON)"
              name="headers"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    try {
                      JSON.parse(value);
                      return Promise.resolve();
                    } catch (e) {
                      return Promise.reject(new Error('Payload must be valid JSON'));
                    }
                  },
                },
              ]}>
              <Input.TextArea
                placeholder='e.g. {"type":"death"}'
                rows={3}
              />
            </Form.Item>
  
            <Form.Item
              label="Payload (JSON)"
              name="payload"
              rules={[
                {
                  required: true,
                  message: 'Payload is required',
                },
                {
                  validator: (_, value) => {
                    if (!value.trim().startsWith('[')) {
                      return Promise.resolve();
                    }
            
                    try {
                      const parsed = JSON.parse(value);
            
                      if (!Array.isArray(parsed)) {
                        return Promise.reject(new Error('If JSON, payload must be an array'));
                      }
            
                      const isValid = parsed.every(
                        (item) => typeof item === 'object' && item !== null && 'payload' in item
                      );
            
                      if (!isValid) {
                        return Promise.reject(
                          new Error('Each item in the array must be an object with a "payload" key')
                        );
                      }
            
                      return Promise.resolve();
                    } catch (e) {
                      return Promise.reject(new Error('Payload must be valid JSON'));
                    }
                  },
                },
              ]}
            >
              <Input.TextArea
                placeholder='e.g. {
    "callbackUrl" : "https://api.hip-uat.digital.health.nz/fhir/nhi/v1/Patient/ZAT2348",
    "deathDate" : "2016-02-18"
}'
                rows={8}
              />
            </Form.Item>
  
            <Form.Item>
              <Button
                type="primary"
                shape="round"
                htmlType="submit"
              >
                Submit Event
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );

  return (
    <div>
      <Collapse
        items={[
          {
            key: 'streams',
            label: 'Publish Custom Events',
            children: CustomEvents,
          },
        ]}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined
            style={{ fontSize: '20px', padding: '15px 0 0 0' }}
            rotate={isActive ? 90 : 0}
          />
        )}
        size="medium"
        activeKey={streamedEvents.length != -1 ? ['streams'] : []}
        collapsible={session ? null : 'disabled'}
      />
    </div>
  );
};

export default CustomEvent;