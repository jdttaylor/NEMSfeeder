import React, { useState, useEffect } from 'react';
import { InputGroup } from 'react-bootstrap';
import { Form, Input, Modal, List, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { validateTopic, getSubscribedTopics } from '../util/helpers/nems';

export const TopicSelector = () => {
  const [queueName, setQueueName] = useState('');
  const [topics, setTopics] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalWidth, setModalWidth] = useState(540);
  const [selectedTopic, setSelectedTopic] = useState('');

  const form = Form.useFormInstance();

  const handleTopicSelect = async () => {
    getSubscribedTopics(queueName)
    .then((data) => {
      setTopics(data);
      setIsModalVisible(true);
    })
    .catch((error) => {
      console.error('Error in handleTopicSelect:', error);
    });
  };

  const handleTopicFormat = (topic) => {

    setSelectedTopic(topic);
    form.setFieldsValue({ topic: topic });
    setIsModalVisible(false);
  };

  useEffect(() => {
    if (topics.length === 0) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '14px Arial'; 

    const maxWidth = Math.max(...topics.map(t => context.measureText(t).width)) + 80; 
    setModalWidth(Math.min(Math.max(540, maxWidth), 1200)); 
  }, [topics]);

  return (
    <>
      <Form.Item label="Queue Name">
        <InputGroup compact>
          <Input
            style={{ width: 'calc(100% - 100px)' }}
            value={queueName}
            onChange={(e) => setQueueName(e.target.value)}
            placeholder="Enter queue name"
          />
          <Tooltip title="Search Subscribed Topics">
            <SearchOutlined
              onClick={handleTopicSelect}
              style={{ fontSize: 20, paddingLeft: 10, cursor: 'pointer' }}
            />
          </Tooltip>
        </InputGroup>
      </Form.Item>

      <Modal
        title="Select a Topic"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={modalWidth}
      >
        <List
          dataSource={topics}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleTopicFormat(item)}
              style={{
                cursor: 'pointer',
                padding: '8px',
                transition: 'background-color 0.3s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e6f7ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item}
            </List.Item>
          )}
        />
      </Modal>
      <Form.Item 
          label="Topic"
          name="topic"
          rules={[
            {
              required: true,
              message: 'Topic is required',
            },
            {
              validator: (_, value) => {
                if (queueName.length === 0) {
                  return Promise.resolve();
                } 

                if (!validateTopic(value, selectedTopic)) {
                  return Promise.reject(
                    new Error(`Topic not compliant: ${selectedTopic}`)
                  );
                }
        
              },
            },
          ]}>
        <Input />
      </Form.Item>
    </>
  );
};

export default TopicSelector;