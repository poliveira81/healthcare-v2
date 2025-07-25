import express from 'express';
import mentorRouter from './mentor';

const app = express();
app.use(express.json());
app.use('/mentor', mentorRouter);

// SSE endpoint
app.get('/sse', (req, res) => {
  // Set required headers for SSE
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  // Example: send a ping every 5 seconds
  const intervalId = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ time: new Date() })}\n\n`);
  }, 5000);

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MCP Server listening on port ${port}`);
});
