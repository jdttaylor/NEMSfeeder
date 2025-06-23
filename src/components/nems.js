import React, { useState } from 'react';
import { Form, Input, Modal, List, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export const QueueTopicSelector = () => {
  const [queueName, setQueueName] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleTopicSelect = async () => {
    if (!queueName) return;

    try {
      const res = await fetch(`http://localhost:8081/subscriptions/${queueName}`);
      const data = await res.json();
      setTopics(data);
      setIsModalVisible(true);
    } catch (err) {
      console.error('Error fetching topics:', err);
    }
  };

  const handleTopicFormat = (rawTopic) => {
    let formattedTopic = rawTopic;

    // Example formatting: expand "demographics/>" to full topic structure
    if (formattedTopic === 'demographics/>') {
      formattedTopic = 'demographics/patient/death/{verb}/0.1.0/{district}/{domicle}/{gp_practice}';
    }

    setSelectedTopic(formattedTopic);
    setIsModalVisible(false);
  };

  return (
    <>
      <Form.Item label="Queue Name">
        <Input.Group compact>
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
        </Input.Group>
      </Form.Item>

      <Form.Item label="Topic">
        <Input value={selectedTopic} readOnly />
      </Form.Item>

      <Modal
        title="Select a Topic"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
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
    </>
  );
};