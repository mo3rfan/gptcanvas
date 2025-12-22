import type { ChatState, MessageNode, Settings } from './types';
import { estimateTokens } from './utils';

export const getMock1Conversation = (settings: Settings): ChatState => {
    // Pre-defined node IDs for consistency
    const ids = {
        user1: 'mock-user-1',
        asst1: 'mock-asst-1',
        user2: 'mock-user-2',
        asst2: 'mock-asst-2',
        user3: 'mock-user-3',
        asst3: 'mock-asst-3',
        // Branch 1: Performance optimization
        userBranch1: 'mock-user-branch-1',
        asstBranch1: 'mock-asst-branch-1',
        userBranch1Reply: 'mock-user-branch-1-reply',
        asstBranch1Reply: 'mock-asst-branch-1-reply',
        // Branch 2: State management
        userBranch2: 'mock-user-branch-2',
        asstBranch2: 'mock-asst-branch-2',
        // Branch 3: Memoization deep dive
        userBranch3: 'mock-user-branch-3',
        asstBranch3: 'mock-asst-branch-3',
    };

    // Initial conversation
    const user1Content = "What are the best practices for optimizing React applications?";
    const asst1Content = `<think>
The user is asking about React optimization best practices. I should provide a comprehensive overview covering key techniques like memoization, code splitting, and performance monitoring.
</think>

### React Application Optimization Best Practices

Optimizing React applications involves several key strategies:

#### 1. **Component Memoization**
Use \`React.memo\` to prevent unnecessary re-renders:
\`\`\`javascript
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>;
});
\`\`\`

#### 2. **Code Splitting**
Leverage dynamic imports for lazy loading:
\`\`\`javascript
const Dashboard = lazy(() => import('./Dashboard'));
\`\`\`

#### 3. **Virtual Scrolling**
For large lists, use libraries like \`react-window\` or \`react-virtualized\` to render only visible items.

#### 4. **State Management**
Keep state as local as possible and avoid unnecessary global state. Use Context API judiciously to prevent prop drilling without sacrificing performance.

#### 5. **Performance Monitoring**
Use React DevTools Profiler to identify bottlenecks and measure component render times.

Would you like me to dive deeper into any of these techniques?`;

    const user2Content = "Can you explain more about when to use useMemo vs useCallback?";
    const asst2Content = `<think>
The user wants clarification on the difference between useMemo and useCallback hooks. I should explain their purposes, use cases, and provide concrete examples.
</think>

### useMemo vs useCallback: A Practical Guide

Both hooks are optimization tools, but they serve different purposes:

#### **useMemo**
Memoizes the **result** of a computation:
\`\`\`javascript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
\`\`\`

**Use when:**
- You have expensive calculations
- You want to avoid re-computing derived values
- The computation depends on specific dependencies

#### **useCallback**
Memoizes the **function itself**:
\`\`\`javascript
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
\`\`\`

**Use when:**
- Passing callbacks to optimized child components wrapped in \`React.memo\`
- The function is used as a dependency in other hooks
- You want to maintain referential equality

#### **Key Difference**
$$\\text{useMemo} = \\text{memoize value} \\quad | \\quad \\text{useCallback} = \\text{memoize function}$$

**Pro tip:** Don't overuse these hooks! They add overhead. Only use them when you've identified actual performance issues through profiling.`;

    const user3Content = "What about server-side rendering considerations?";
    const asst3Content = `<think>
The user is asking about SSR considerations for React optimization. I should cover hydration, data fetching strategies, and performance implications.
</think>

### Server-Side Rendering (SSR) Optimization

SSR introduces unique optimization challenges and opportunities:

#### **1. Hydration Performance**
Minimize the JavaScript bundle size to speed up hydration:
\`\`\`javascript
// Use selective hydration with React 18
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document.getElementById('root'), <App />);
\`\`\`

#### **2. Data Fetching Strategies**
- **Static Generation (SSG):** Pre-render at build time for maximum performance
- **Incremental Static Regeneration (ISR):** Update static pages after deployment
- **Streaming SSR:** Send HTML in chunks as it's generated

#### **3. Code Splitting with SSR**
Ensure dynamic imports work correctly on both server and client:
\`\`\`javascript
const DynamicComponent = dynamic(() => import('./Heavy'), {
  ssr: true, // or false to skip SSR for this component
  loading: () => <Spinner />
});
\`\`\`

#### **4. Avoid Hydration Mismatches**
Ensure server and client render the same initial HTML to prevent costly re-renders.

The key is balancing Time to First Byte (TTFB) with Time to Interactive (TTI).`;

    // Branch 1: Deep dive into React.memo
    const userBranch1Content = "How does React.memo actually work under the hood?";
    const asstBranch1Content = `<think>
The user highlighted "React.memo" and wants to understand its internal mechanism. I should explain the shallow comparison algorithm and when it triggers re-renders.
</think>

### Follow-up on: *"React.memo"*

#### Internal Mechanism of React.memo

\`React.memo\` is a higher-order component that implements shallow comparison:

\`\`\`javascript
function memo(Component, arePropsEqual) {
  return class MemoizedComponent extends React.Component {
    shouldComponentUpdate(nextProps) {
      // Default: shallow comparison
      return !shallowEqual(this.props, nextProps);
    }
    
    render() {
      return <Component {...this.props} />;
    }
  };
}
\`\`\`

#### **Shallow Comparison Algorithm**
React compares each prop using \`Object.is()\`:
$$\\text{shouldUpdate} = \\exists \\text{ prop } p : \\text{Object.is}(\\text{prev}[p], \\text{next}[p]) = \\text{false}$$

#### **Custom Comparison**
You can provide a custom comparison function:
\`\`\`javascript
const MyComponent = React.memo(Component, (prevProps, nextProps) => {
  // Return true if props are equal (skip render)
  return prevProps.id === nextProps.id;
});
\`\`\`

**Important:** This only checks props, not state or context!`;

    const userBranch1ReplyContent = "What about comparing complex objects?";
    const asstBranch1ReplyContent = `<think>
The user is asking about comparing complex objects in React.memo. I should explain the limitations of shallow comparison and suggest solutions like deep equality checks or normalization.
</think>

### Comparing Complex Objects in React.memo

Shallow comparison fails with nested objects:

\`\`\`javascript
// ❌ This will always re-render
<MyComponent data={{ user: { name: 'John' } }} />

// ✅ Better: Memoize the object
const userData = useMemo(() => ({ user: { name: 'John' } }), []);
<MyComponent data={userData} />
\`\`\`

#### **Solutions:**

**1. Deep Equality (use sparingly)**
\`\`\`javascript
import isEqual from 'lodash/isEqual';

const MyComponent = React.memo(Component, (prev, next) => {
  return isEqual(prev.data, next.data);
});
\`\`\`

**2. Normalize Data Structure**
Flatten nested objects or use IDs instead of objects:
\`\`\`javascript
// Instead of passing entire user object
<UserCard user={user} />

// Pass only the ID and select from normalized state
<UserCard userId={user.id} />
\`\`\`

**3. Use Immutable Data Structures**
Libraries like Immer or Immutable.js make reference equality checks reliable.

**Performance Note:** Deep equality checks can be expensive. Profile before optimizing!`;

    // Branch 2: State management deep dive
    const userBranch2Content = "What are the alternatives to Context API for state management?";
    const asstBranch2Content = `<think>
The user highlighted "Context API" and wants to know about alternative state management solutions. I should cover popular libraries and their trade-offs.
</think>

### Follow-up on: *"Context API"*

#### State Management Alternatives

**1. Redux Toolkit**
The modern, opinionated Redux approach:
\`\`\`javascript
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1; }
  }
});
\`\`\`

**Pros:** Predictable, great DevTools, middleware ecosystem
**Cons:** Boilerplate, learning curve

**2. Zustand**
Minimalist state management:
\`\`\`javascript
import create from 'zustand';

const useStore = create(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}));
\`\`\`

**Pros:** Simple API, no providers, small bundle
**Cons:** Less structure, fewer conventions

**3. Jotai**
Atomic state management:
\`\`\`javascript
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const Counter = () => {
  const [count, setCount] = useAtom(countAtom);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
};
\`\`\`

**Pros:** Fine-grained reactivity, TypeScript-first
**Cons:** Different mental model

**4. Recoil**
Facebook's experimental state library with similar concepts to Jotai.

**When to use each:**
- **Context API:** Simple, localized state
- **Redux:** Complex apps, time-travel debugging
- **Zustand/Jotai:** Modern apps, minimal boilerplate`;

    // Branch 3: Memoization mathematics
    const userBranch3Content = "Can you explain the mathematical complexity of memoization?";
    const asstBranch3Content = `<think>
The user highlighted "memoization" and wants a mathematical analysis. I should explain time-space trade-offs and computational complexity.
</think>

### Follow-up on: *"memoization"*

#### Mathematical Analysis of Memoization

Memoization trades **space** for **time** complexity:

#### **Time Complexity**
Without memoization (naive Fibonacci):
$$T(n) = T(n-1) + T(n-2) + O(1) \\implies O(2^n)$$

With memoization:
$$T(n) = O(n) \\text{ (each subproblem solved once)}$$

#### **Space Complexity**
$$S(n) = O(n) \\text{ (cache storage)}$$

#### **Cache Hit Rate**
The effectiveness depends on the hit rate:
$$\\text{Speedup} = \\frac{1}{(1 - h) + \\frac{h}{k}}$$

Where:
- $h$ = cache hit rate (0 to 1)
- $k$ = speedup factor for cache hits

#### **React-Specific Analysis**
For a component tree with depth $d$ and branching factor $b$:
- **Without memo:** $O(b^d)$ renders on state change
- **With memo:** $O(d)$ renders (only affected path)

\`\`\`javascript
// Example: Fibonacci with memoization
const fib = (() => {
  const cache = new Map();
  return (n) => {
    if (n <= 1) return n;
    if (cache.has(n)) return cache.get(n);
    const result = fib(n - 1) + fib(n - 2);
    cache.set(n, result);
    return result;
  };
})();
\`\`\`

**Key Insight:** Memoization is most effective when:
1. Computation is expensive ($O(n)$ or worse)
2. Same inputs occur frequently (high hit rate)
3. Cache overhead is negligible compared to computation cost`;

    // Build the nodes object
    const nodes: Record<string, MessageNode> = {
        [ids.user1]: {
            id: ids.user1,
            role: 'user',
            content: user1Content,
            parentId: null,
            childrenIds: [ids.asst1],
            isCollapsed: false,
        },
        [ids.asst1]: {
            id: ids.asst1,
            role: 'assistant',
            content: asst1Content,
            parentId: ids.user1,
            childrenIds: [ids.user2, ids.userBranch1, ids.userBranch2],
            isCollapsed: false,
        },
        [ids.user2]: {
            id: ids.user2,
            role: 'user',
            content: user2Content,
            parentId: ids.asst1,
            childrenIds: [ids.asst2],
            isCollapsed: false,
        },
        [ids.asst2]: {
            id: ids.asst2,
            role: 'assistant',
            content: asst2Content,
            parentId: ids.user2,
            childrenIds: [ids.user3, ids.userBranch3],
            isCollapsed: false,
        },
        [ids.user3]: {
            id: ids.user3,
            role: 'user',
            content: user3Content,
            parentId: ids.asst2,
            childrenIds: [ids.asst3],
            isCollapsed: false,
        },
        [ids.asst3]: {
            id: ids.asst3,
            role: 'assistant',
            content: asst3Content,
            parentId: ids.user3,
            childrenIds: [],
            isCollapsed: false,
        },
        // Branch 1: React.memo deep dive
        [ids.userBranch1]: {
            id: ids.userBranch1,
            role: 'user',
            content: userBranch1Content,
            parentId: ids.asst1,
            highlightedText: 'React.memo',
            isBranch: true,
            childrenIds: [ids.asstBranch1],
            isCollapsed: false,
        },
        [ids.asstBranch1]: {
            id: ids.asstBranch1,
            role: 'assistant',
            content: asstBranch1Content,
            parentId: ids.userBranch1,
            childrenIds: [ids.userBranch1Reply],
            isCollapsed: false,
        },
        [ids.userBranch1Reply]: {
            id: ids.userBranch1Reply,
            role: 'user',
            content: userBranch1ReplyContent,
            parentId: ids.asstBranch1,
            childrenIds: [ids.asstBranch1Reply],
            isCollapsed: false,
        },
        [ids.asstBranch1Reply]: {
            id: ids.asstBranch1Reply,
            role: 'assistant',
            content: asstBranch1ReplyContent,
            parentId: ids.userBranch1Reply,
            childrenIds: [],
            isCollapsed: false,
        },
        // Branch 2: State management alternatives
        [ids.userBranch2]: {
            id: ids.userBranch2,
            role: 'user',
            content: userBranch2Content,
            parentId: ids.asst1,
            highlightedText: 'Context API',
            isBranch: true,
            childrenIds: [ids.asstBranch2],
            isCollapsed: false,
        },
        [ids.asstBranch2]: {
            id: ids.asstBranch2,
            role: 'assistant',
            content: asstBranch2Content,
            parentId: ids.userBranch2,
            childrenIds: [],
            isCollapsed: false,
        },
        // Branch 3: Memoization mathematics
        [ids.userBranch3]: {
            id: ids.userBranch3,
            role: 'user',
            content: userBranch3Content,
            parentId: ids.asst2,
            highlightedText: 'memoization',
            isBranch: true,
            childrenIds: [ids.asstBranch3],
            isCollapsed: false,
        },
        [ids.asstBranch3]: {
            id: ids.asstBranch3,
            role: 'assistant',
            content: asstBranch3Content,
            parentId: ids.userBranch3,
            childrenIds: [],
            isCollapsed: false,
        },
    };

    // Calculate token statistics
    let inputTokens = 0;
    let outputTokens = 0;

    Object.values(nodes).forEach(node => {
        const tokens = estimateTokens(node.content);
        if (node.role === 'user') {
            inputTokens += tokens;
        } else {
            outputTokens += tokens;
        }
    });

    return {
        nodes,
        rootId: ids.user1,
        selectedModel: settings.model,
        apiUrl: settings.apiUrl,
        apiKey: settings.apiKey,
        tokenStats: {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
        },
    };
};
