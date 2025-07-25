import express from 'express';
import mentorRouter from './mentor';

const app = express();
app.use(express.json());
app.use('/mentor', mentorRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MCP Server listening on port ${port}`);
});
