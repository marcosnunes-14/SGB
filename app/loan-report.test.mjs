import {test} from 'node:test';
import assert from 'node:assert/strict';
import {borrowersFor, loansInPeriod, rankingStart} from './loan-report.ts';

const loans = [
  {id: '1', student: '  Ana  Silva ', grade: '2º A', title: 'A', code: '1', delivery: '2026-09-01', status: 'Devolvido'},
  {id: '2', student: 'ana silva', grade: '2º A', title: 'B', code: '2', delivery: '2026-09-24', status: 'Emprestado'},
  {id: '3', student: 'Ana Silva', grade: '3º B', title: 'C', code: '3', delivery: '2026-09-24', status: 'Emprestado'},
  {id: '4', student: 'Bruno', grade: '2º A', title: 'D', code: '4', delivery: '2026-08-31', status: 'Emprestado'},
];

test('datas inicial e final são inclusivas e o intervalo inválido não conta empréstimos', () => {
  assert.equal(loansInPeriod(loans, '2026-09-01', '2026-09-24').length, 3);
  assert.equal(loansInPeriod(loans, '2026-09-24', '2026-09-01').length, 0);
});

test('agrupa nomes normalizados por série e ordena por quantidade', () => {
  const people = borrowersFor(loansInPeriod(loans, '2026-09-01', '2026-09-24'));
  assert.deepEqual(people.map(p => [p.grade, p.loans.length]), [['2º A', 2], ['3º B', 1]]);
});

test('semana começa segunda-feira, inclusive na troca de mês ou ano', () => {
  assert.equal(rankingStart('week', new Date(2026, 8, 1)), '2026-08-31');
  assert.equal(rankingStart('week', new Date(2027, 0, 3)), '2026-12-28');
  assert.equal(rankingStart('month', new Date(2026, 8, 24)), '2026-09-01');
  assert.equal(rankingStart('year', new Date(2026, 8, 24)), '2026-01-01');
});
