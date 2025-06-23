import React, { useState, useEffect, useContext, useRef } from 'react';
import solace, { SolclientFactory } from 'solclientjs';
import { InputGroup } from 'react-bootstrap';
import { SessionContext } from '../util/helpers/solaceSession';
import { Button, List, Tag, Collapse, message, Tooltip } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import Highlighter from 'react-highlight-words';
import {
  CopyOutlined,
  CaretRightOutlined,
  ClearOutlined,
} from '@ant-design/icons';

const MAX_RENDERED_EVENTS = 100;

const SubscribeEvents = () => {
  const { streamedEvents, setStreamedEvents, session } =
    useContext(SessionContext);
  const [showAllPayloads, setShowAllPayloads] = useState(false);
  const [showPayload, setShowPayload] = useState(null);
  const scrollableDivRef = useRef(null);
  const [search, setSearch] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [subscribedTopic, setSubscribedTopic] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');

  const handleCopy = (value) => {
    navigator.clipboard.writeText(JSON.stringify(value.payload, null, 2));
    message.success(`${value.eventName} Payload Copied!`);
  };

  useEffect(() => {
    if (scrollableDivRef.current) {
      scrollableDivRef.current.scrollTop =
        scrollableDivRef.current.scrollHeight;
    }

    if (streamedEvents.length > MAX_RENDERED_EVENTS) {
      setStreamedEvents(streamedEvents.slice(MAX_RENDERED_EVENTS));
    }
  }, [streamedEvents]);

  useEffect(() => {
    if (!session) return;
  
    const messageListener = (message) => {
      try {
        //const payload = JSON.parse(message.getBinaryAttachment());
        const rawPayload = message.getBinaryAttachment();

        let textPayload;
        if (rawPayload instanceof Uint8Array) {
            const decoder = new TextDecoder('utf-8');
            textPayload = decoder.decode(rawPayload);
        } else {
            textPayload = rawPayload; // already a string
        }

        let payload;
        try {
           payload = JSON.parse(textPayload);
        } catch (e) {
           payload = textPayload;
        }
        const topic = message.getDestination().getName();
        const topicParts = topic.split('/');
        const eventName = topicParts.length > 2 ? topicParts[2] : 'Unknown Event';

        const userPropsMap = message.getUserPropertyMap(); // returns string[]
        const userProps = {};

        if (userPropsMap) {
            userPropsMap.getKeys().forEach((key) => {
              console.log(key);
              userProps[key] = userPropsMap.getField(key).getValue();
            });
          }
        /* if (userPropsMap) {
            for (const key in userPropsMap) {
              if (Object.prototype.hasOwnProperty.call(userPropsMap, key)) {
                userProps[key] = userPropsMap[key];
              }
            }
          } */
        
        const headers = {
            ...(userProps && Object.keys(userProps).length > 0 ? userProps : {}),
            correlationId: message.getCorrelationId?.(),
            messageId: message.getMessageId?.(),
            deliveryMode: message.getDeliveryMode?.(),
            timeToLive: message.getTimeToLive?.(),
            timestamp: message.getTimeStamp?.(),
            priority: message.getPriority?.()
        };
  
        const enrichedPayload = {
            headers,
            payload
          };

        const event = {
          topic,
          eventName,
          payload: enrichedPayload,
          tagColor: 'blue',
          countSend: 1,
        };
        console.log(payload);
        setStreamedEvents((prev) => [...prev, event]);
      } catch (err) {
        console.error('Failed to parse message payload:', err);
      }
    };
  
    // Register Solace message handler
    session.on(solace.SessionEventCode.MESSAGE, messageListener);
  
    return () => {
      session.off(solace.SessionEventCode.MESSAGE, messageListener);
    };
  }, [session, setStreamedEvents]);

  useEffect(() => {
    if (!session) return;
  
    const onSubscriptionOk = (sessionEvent) => {
      console.log(
        `✅ Subscription succeeded to topic: ${sessionEvent.correlationKey}`
      );
    };
  
    const onSubscriptionError = (sessionEvent) => {
      console.error(
        `❌ Subscription failed for topic: ${sessionEvent.correlationKey}`,
        sessionEvent
      );
    };
  
    session.on(solace.SessionEventCode.SUBSCRIPTION_OK, onSubscriptionOk);
    session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, onSubscriptionError);
  
    return () => {
      session.off(solace.SessionEventCode.SUBSCRIPTION_OK, onSubscriptionOk);
      session.off(solace.SessionEventCode.SUBSCRIPTION_ERROR, onSubscriptionError);
    };
  }, [session]);

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
    setSubscriptionStatus(`Subscribing to topic: ${topicInput}`);
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

    setSubscriptionStatus(`Unsubscribed from: ${subscribedTopic}`);
    setSubscribedTopic('');
  };

  const Streams = (
    <div>
      {streamedEvents.length > 0 ? (
        <>
          <div>
            <InputGroup className="mt3 mb3" style={{ maxWidth: '500px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Filter published stream on event name, payload, and topics"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value.toLowerCase());
                  console.log(search.length);
                  search.length == 1
                    ? setShowAllPayloads(false)
                    : setShowAllPayloads(true);
                }}
              />
              <Tooltip title="Clear search">
                <ClearOutlined
                  onClick={(e) => {
                    setSearch('');
                    setShowAllPayloads(false);
                  }}
                  style={{ padding: '0 0 0 10px' }}
                ></ClearOutlined>
              </Tooltip>
            </InputGroup>
          </div>
          
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '0 30px 0 0',
            }}
          >
            <List>
              <List.Item
                key={'streams options'}
                actions={[
                  <Tag>
                    Displaying the last {MAX_RENDERED_EVENTS} published events
                  </Tag>,
                  <Button
                    color="primary"
                    variant="outlined"
                    onClick={() => setStreamedEvents([])}
                  >
                    Clear All Events
                  </Button>,
                  <Tooltip
                    title="Click on event to show single payload"
                    mouseLeaveDelay={0.5}
                    overlayStyle={{ textAlign: 'center !important' }}
                  >
                    <Button
                      color="primary"
                      variant="outlined"
                      onClick={() => setShowAllPayloads(!showAllPayloads)}
                    >
                      {showAllPayloads
                        ? 'Hide All Payloads'
                        : 'Show All Payloads'}
                    </Button>
                  </Tooltip>,
                ]}
              ></List.Item>
            </List>
          </div>
          <div
            id="scrollableDiv"
            ref={scrollableDivRef}
            style={{
              height: 300,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <InfiniteScroll
              dataLength={streamedEvents.length}
              scrollableTarget="scrollableDiv"
            >
              <List
                dataSource={streamedEvents.filter(
                  (item) =>
                    item.eventName
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    JSON.stringify(item.payload, null, 2)
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    item.topic.toLowerCase().includes(search.toLowerCase())
                )}
                renderItem={(event) => (
                  <List.Item
                    key={event.eventName}
                    actions={[
                      <Tooltip title="Copy Payload">
                        <Button
                          color="primary"
                          icon={<CopyOutlined />}
                          onClick={() => handleCopy(event)}
                          style={{ background: 'none', border: 'none' }}
                        ></Button>
                      </Tooltip>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ padding: '10px 0 0 0' }}>
                          <Tag color={event.tagColor}>
                            <Highlighter
                              searchWords={[search]}
                              autoEscape={true}
                              textToHighlight={` ${event.countSend} | ${event.eventName}`}
                            />
                          </Tag>
                        </div>
                      }
                      title={
                        <Highlighter
                          searchWords={[search]}
                          autoEscape={true}
                          textToHighlight={event.topic}
                        />
                      }
                      description={
                        showAllPayloads || showPayload == event ? (
                          <pre
                            style={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            <Highlighter
                              searchWords={[search]}
                              autoEscape={true}
                              textToHighlight={JSON.stringify(
                                event.payload,
                                null,
                                2
                              )}
                            />
                          </pre>
                        ) : (
                          ''
                        )
                      }
                      onClick={() =>
                        setShowPayload(showPayload === event ? null : event)
                      }
                    />
                  </List.Item>
                )}
              />
            </InfiniteScroll>
          </div>
        </>
      ) : (
        <List>
          <List.Item>
            <List.Item.Meta
              title="No Streams Published"
              description="Publish messages to see them here. Connect to a broker and then choose the streams you want to publish"
            />
          </List.Item>
        </List>
      )}
    </div>
  );

  return (
    <div>
      <Collapse
        items={[
          {
            key: 'streams',
            label: 'Messages',
            children: Streams,
          },
        ]}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined
            style={{ fontSize: '20px', padding: '15px 0 0 0' }}
            rotate={isActive ? 90 : 0}
          />
        )}
        size="medium"
        activeKey={streamedEvents.length > 0 ? ['streams'] : []}
        collapsible={session ? null : 'disabled'}
      />
    </div>
  );
};

export default SubscribeEvents;
