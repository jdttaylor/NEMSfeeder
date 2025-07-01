const LOCALSTORAGE_URL = 'http://localhost:8081';

  function matchTemplate(subscriptionTopic, topicTemplates) {

    const topicParts = subscriptionTopic.split('/');
    const matchedTemplates = [];
                            
    for (const t of topicTemplates) {
        const templateParts = t.split('/');
        let isMatch = true;

        for (let i = 0; i < topicParts.length; i++) {
            const topicPart = topicParts[i];
            const tempPart = templateParts[i];

            if (templateParts.length > topicParts.length) {
                if (!subscriptionTopic.endsWith('>')) {
                    isMatch = false;
                    break;
                }
            }

            if (!tempPart) {
                isMatch = false;
                break;
            }

            if (topicPart === '*' || topicPart === '>') {
                continue;
            }

            if (tempPart.startsWith('{')) {
                continue;
            }

            if (topicPart !== tempPart) {
                isMatch = false;
                break;
            }
        }

        if (isMatch) {
            matchedTemplates.push(t);
        }
    }

    return matchedTemplates;

  }

  function mergeEmptyTemplate(subscriptionTopic) {

    const adhocTemplate = [];
    const topicParts = subscriptionTopic.split('/');

    for (const tp of topicParts) {

        if (tp === '>') {
            adhocTemplate.push('{any...}');
        } else if (tp.includes('*')) {
            const prefix = tp.replace(/\*/g, '');
            adhocTemplate.push(`${prefix}{any}`);
        } else {
            adhocTemplate.push(tp);
        }
    }

    return adhocTemplate.join('/');
  }

  function mergeTopicTemplate(subscriptionTopic, topicTemplate) {

    const resolved = [];
    const topicParts = subscriptionTopic.split('/');
    const templateParts = topicTemplate.split('/');

    for (let i = 0; i < templateParts.length; i++) {

        const topicPart = topicParts[i];
        const tempPart = templateParts[i];

        if (topicPart === '>') {
            resolved.push(...templateParts.slice(i));
            break;
        } else if (!topicPart || topicPart === '*') {
            resolved.push(tempPart);
        } else if (tempPart.startsWith('{')) {
            const prefix = topicPart.replace(/\*/g, '');
            resolved.push(`${prefix}${tempPart}`);
        } else {
            resolved.push(topicPart);
        }
    }

    return resolved.join('/');

  }

  export async function formatTopic(subscribeTopic) {

    try {
        let finalTopic = null;
        const topicResponse = await fetch(`${LOCALSTORAGE_URL}/feeds`);
        if (!topicResponse.ok) {
            throw new Error(`Failed to fetch topics. Status: ${topicResponse.status}`);
        }

        const topicData = await topicResponse.json();
        const topicTemplates = topicData.map(f => f.feedinfo?.topic).filter(Boolean);

        const matchedTemplates = matchTemplate(subscribeTopic, topicTemplates);
        
        if (matchedTemplates.length === 0) {
            return mergeEmptyTemplate(subscribeTopic);
        } 

        const formattedTopics = matchedTemplates.map(template => mergeTopicTemplate(subscribeTopic, template));
      
        return formattedTopics;

    } catch (err) {
        console.error(`Error formatting subscription topic: ${subscribeTopic} ${err}`);
        return [];
    }

  }

  export async function getSubscribedTopics(queueName) {

    if (!queueName) throw new Error('Queue name is required');

    try {

      const subscriptionResponse = await fetch(`${LOCALSTORAGE_URL}/subscriptions/${queueName}`);
      const subscriptions = await subscriptionResponse.json();
      const allTaxonomies = await Promise.all(subscriptions.map(formatTopic));

      const topicTaxonomies = Array.from(
        new Set(allTaxonomies.flat())
      );
  
      return topicTaxonomies;

    } catch (err) {
      console.error('Error resolving subscriptions:', err);
      throw err;
    }

  }

  export function validateTopic(topic, topicTemplate) {

    const topicParts = topic.split('/');
    const templateParts = topicTemplate.split('/');
    let isValid = true;

    for (let i = 0; i < topicParts.length; i++) {

        const topicPart = topicParts[i];
        const tempPart = templateParts[i];
      
        if (topic.includes('*') || topic.includes('{') || topic.includes('}')) {
            isValid = false;
            break;
        } else if (topicPart === tempPart) {
            continue;
        } else if (topicPart !== tempPart && tempPart.startsWith('{') && tempPart.endsWith('}')) {
            continue;
        } else if (!tempPart.startsWith('{') && tempPart.includes('{')) {
            if (topicPart.startsWith(tempPart.substring(0,tempPart.indexOf('{')))) {
                continue;
            } else {
              isValid = false;
              break;
            }
        } else if (tempPart === '{any...}') {
            break;
        }  else {
            isValid = false;
            break;
        }
    }

    return isValid;

  }