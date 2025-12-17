
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: TransactionType;
  category: string;
}

export interface BudgetStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  monthlyData: { month: string; income: number; expense: number }[];
}

export const INCOME_CATEGORIES = [
  'Visite Specialistiche',
  'Interventi Chirurgici',
  'Diagnostica',
  'Consulenze',
  'Assicurazioni',
  'Altro'
];

export const EXPENSE_CATEGORIES = [
  'Affitto e Struttura',
  'Materiale Medico',
  'Stipendi Staff',
  'Utenze',
  'Marketing',
  'Manutenzione Apparati',
  'Altro'
];
