export type ReportLoan = {
  id: string;
  student?: string;
  grade?: string;
  title?: string;
  code?: string;
  delivery?: string;
  status?: string;
};

export type Borrower = {
  name: string;
  grade: string;
  loans: ReportLoan[];
  lastDelivery: string;
};

const normalize = (value: string | undefined) => (value || '').trim().replace(/\s+/g, ' ');
const key = (value: string | undefined) => normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function loansInPeriod(loans: ReportLoan[], start: string, end: string) {
  if (!start || !end || start > end) return [];
  return loans.filter(loan => loan.delivery && loan.delivery >= start && loan.delivery <= end);
}

export function borrowersFor(loans: ReportLoan[]): Borrower[] {
  const people = new Map<string, Borrower>();
  for (const loan of loans) {
    const name = normalize(loan.student);
    const grade = normalize(loan.grade);
    if (!name) continue;
    // A série diferencia alunos homônimos, conforme os dados disponíveis no cadastro.
    const identity = `${key(name)}\u0000${key(grade)}`;
    const person = people.get(identity) || {name, grade, loans: [], lastDelivery: ''};
    person.loans.push(loan);
    if (loan.delivery && loan.delivery > person.lastDelivery) person.lastDelivery = loan.delivery;
    people.set(identity, person);
  }
  return [...people.values()].sort((a, b) => b.loans.length - a.loans.length ||
    b.lastDelivery.localeCompare(a.lastDelivery) || a.name.localeCompare(b.name, 'pt-BR'));
}

export type RankingPeriod = 'week' | 'month' | 'year' | 'all';

export function rankingStart(period: RankingPeriod, today: Date) {
  const year = today.getFullYear();
  const month = today.getMonth();
  if (period === 'all') return '0000-01-01';
  const start = period === 'year' ? new Date(year, 0, 1) :
    period === 'month' ? new Date(year, month, 1) :
    new Date(year, month, today.getDate() - (today.getDay() + 6) % 7);
  return localDate(start);
}

export function localDate(day: Date) {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}
