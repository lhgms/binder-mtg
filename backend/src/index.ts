import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import setsRouter from './routes/sets.js';
import bindersRouter from './routes/binders.js';
import cardsRouter from './routes/cards.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(setsRouter);
app.use(bindersRouter);
app.use(cardsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
