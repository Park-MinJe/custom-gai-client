import React, { useState } from 'react';

function App() {
    const [response, setResponse] = useState('');
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    // Unary
    const handleSubmit = async () => {
        console.log("[React] input: ", input);
        try {
            const result = await (window as any).api.runGraph(input);
            console.log("[React] result: ", result);
            setResponse(result);
        } catch (error) {
            console.error(error);
            setResponse('Error communicating with backend.');
        }
    };

    // Streaming
    const handleStream = async () => {
        setResponse('');
        setIsStreaming(true);

        try {
        await (window as any).api.runGraphStream(input, (chunk: string) => {
            setResponse((prev: string) => prev + chunk + '\n');
        });
        } catch (error) {
        console.error(error);
        setResponse('Error during streaming.');
        } finally {
        setIsStreaming(false);
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>gRPC Desktop App</h1>
        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something"
            style={{ padding: '0.5rem', width: '300px' }}
        />
        <button onClick={handleSubmit} style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>
            Send
        </button>
        <button
            onClick={handleStream}
            disabled={isStreaming}
            style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
        >
            {isStreaming ? 'Streaming...' : 'Stream'}
        </button>
        <p style={{ marginTop: '1rem' }}>Response: <b>{response}</b></p>
        </div>
    );
}

export default App;
