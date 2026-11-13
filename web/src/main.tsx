import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Root} from './Root';
import './styles.css';

createRoot(document.getElementById('root')!).render(<Root />);
