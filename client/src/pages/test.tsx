import { useState } from 'react';

export default function TestPage() {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testApiEndpoint = async (endpoint: string) => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      const data = await res.text();
      setResponse(`${endpoint}: ${res.status} - ${data}`);
    } catch (error) {
      setResponse(`${endpoint}: Error - ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="space-y-4">
        <button 
          onClick={() => testApiEndpoint('/api/health')}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
          disabled={loading}
        >
          Test Health Endpoint
        </button>
        
        <button 
          onClick={() => testApiEndpoint('/api/auth/me')}
          className="bg-green-500 text-white px-4 py-2 rounded mr-4"
          disabled={loading}
        >
          Test Auth Me Endpoint
        </button>

        <button 
          onClick={() => testApiEndpoint('/api/ai-mentors')}
          className="bg-purple-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Test AI Mentors Endpoint
        </button>
      </div>

      {loading && <p className="mt-4">Loading...</p>}
      
      {response && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Response:</h3>
          <pre className="mt-2 whitespace-pre-wrap">{response}</pre>
        </div>
      )}
    </div>
  );
}