
import { VercelRequest, VercelResponse } from '@vercel/node';

// NOTA: In ambiente Serverless (Vercel), questa variabile viene resettata continuamente.
// È necessario usare DATABASE_URL per connettersi a un DB reale (es. Supabase, Neon, MongoDB).
let mockTransactions = [
  { id: '1', date: '2024-03-01', amount: 5000, description: 'Affitto mensile studio', type: 'EXPENSE', category: 'Affitto e Struttura' },
  { id: '2', date: '2024-03-05', amount: 12500, description: 'Rimborso Assicurazioni Convenzionate', type: 'INCOME', category: 'Assicurazioni' }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const DATABASE_URL = process.env.DATABASE_URL;

  // Qui dovresti inizializzare il tuo client DB (es. Prisma, Mongoose, pg)
  // if (!DATABASE_URL) console.warn("DATABASE_URL non configurata!");

  switch (method) {
    case 'GET':
      return res.status(200).json(mockTransactions);

    case 'POST':
      const newTx = { ...req.body, id: Date.now().toString() };
      mockTransactions = [newTx, ...mockTransactions];
      return res.status(201).json(newTx);

    case 'DELETE':
      const { id } = req.query;
      mockTransactions = mockTransactions.filter(t => t.id !== id);
      return res.status(204).end();

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
