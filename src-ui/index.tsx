import React from 'react';

import { createRoot } from 'react-dom/client';

const root = createRoot(document.querySelector('#root') as HTMLElement);
root.render(<h1>Hello, world</h1>);
