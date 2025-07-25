import request from 'supertest';
import express from 'express';
import mentorRouter from '../src/mentor';

describe('Mentor API', () => {
  const app = express();
  app.use(express.json());
  app.use('/mentor', mentorRouter);

  it('should return error for missing appSpec', async () => {
    const res = await request(app).post('/mentor/generate').send({});
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to generate app');
  });
});
