console.log('main-debug.tsx: Script loaded');

try {
  console.log('Attempting to create root element test...');
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    console.error('Root element not found!');
  } else {
    console.log('Root element found, inserting test content');
    rootEl.innerHTML = '<div style="padding: 20px; background: red; color: white; font-size: 24px;">DIRECT DOM TEST: If you see this, JS is working</div>';
  }
} catch (error) {
  console.error('Error in main-debug:', error);
}