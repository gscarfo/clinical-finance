
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Middleware
app.use(cors());
app.use(express.json());

// Logging configurazione (senza esporre segreti)
console.log(`[Server] Avvio su porta ${PORT}`);
console.log(`[Database] Configurazione presente: ${DATABASE_URL ? 'SÌ' : 'NO'}`);

// In-memory store per demo (qui andrebbe la connessione DB reale tramite DATABASE_URL)
let transactions = [
  { id: '1', date: '2024-03-01', amount: 5000, description: 'Affitto mensile studio', type: 'EXPENSE', category: 'Affitto e Struttura' },
  { id: '2', date: '2024-03-05', amount: 12500, description: 'Rimborso Assicurazioni Convenzionate', type: 'INCOME', category: 'Assicurazioni' }
];

// API Routes - Definite prima dello static per evitare conflitti
app.get('/api/transactions', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(transactions);
});

app.post('/api/transactions', (req, res) => {
  const newTx = { ...req.body, id: Date.now().toString() };
  transactions = [newTx, ...transactions];
  res.status(201).json(newTx);
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  transactions = transactions.filter(t => t.id !== id);
  res.status(204).send();
});

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// SPA Catch-all: solo per rotte NON-API
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () '0.0.0.0' , => {
  console.log(`[Server] ClinicaFinance AI pronto all'indirizzo http://0.0.0.0:${PORT}`);
});
