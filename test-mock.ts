import { getMock1Conversation } from './src/mockConversations.ts';

const result = getMock1Conversation({
    apiUrl: 'test',
    apiKey: 'test',
    model: 'test'
});

console.log('✓ Mock conversation loaded successfully!');
console.log('  Nodes count:', Object.keys(result.nodes).length);
console.log('  Root ID:', result.rootId);
console.log('  Token stats:', result.tokenStats);
console.log('  Has branches:', Object.values(result.nodes).some(n => n.isBranch));
