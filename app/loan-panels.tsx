"use client";
import {useState} from 'react';
import {BarChart3, CalendarDays, Medal, Users, ArrowLeftRight, BookOpen} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {borrowersFor, loansInPeriod, localDate, rankingStart, type ReportLoan, type RankingPeriod} from './loan-report';

const formatDate = (value: string | undefined) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';

function BorrowerTable({loans, ranking = false}: {loans: ReportLoan[]; ranking?: boolean}) {
  const people = borrowersFor(loans);
  if (!people.length) return <div className="empty"><Users/><h3>Nenhum empréstimo neste período</h3><p>Confira as datas ou registre um empréstimo para exibir os alunos.</p></div>;
  return <div className="table-wrap"><table className="report-table"><thead><tr>{ranking && <th>Posição</th>}<th>Aluno / Série</th><th>Livros emprestados</th><th>Última retirada</th><th>Livros</th></tr></thead><tbody>{people.map((person, index) => <tr key={`${person.name}-${person.grade}`}>
    {ranking && <td className="rank-position">{index + 1}º</td>}
    <td><strong>{person.name}</strong><small>{person.grade || 'Série não informada'}</small></td>
    <td><strong>{person.loans.length}</strong></td><td>{formatDate(person.lastDelivery)}</td>
    <td><details className="report-details"><summary>Ver livros</summary><ul>{person.loans.map(loan => <li key={loan.id}><strong>{loan.title}</strong><span>{loan.code && ` · Código ${loan.code}`} · {formatDate(loan.delivery)} · {loan.status === 'Devolvido' ? 'Devolvido' : 'Emprestado'}</span></li>)}</ul></details></td>
  </tr>)}</tbody></table></div>;
}

export function ReportsPanel({loans, loading}: {loans: ReportLoan[]; loading: boolean}) {
  const today = new Date();
  const [start, setStart] = useState(() => localDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [end, setEnd] = useState(() => localDate(today));
  const valid = Boolean(start && end && start <= end);
  const selected = valid ? loansInPeriod(loans, start, end) : [];
  const people = borrowersFor(selected);
  return <>
    <div className="page-heading"><div><span className="eyebrow">CIRCULAÇÃO DO ACERVO</span><h1>Relatórios</h1><p>Consulte quem retirou livros no intervalo escolhido, incluindo as duas datas.</p></div><CalendarDays className="report-heading-icon" size={32}/></div>
    <section className="panel report-filters" aria-label="Período do relatório"><div className="panel-heading"><div><h2>Escolha o período</h2><p>O filtro considera a data de entrega registrada em cada empréstimo.</p></div></div><div className="report-date-fields"><label>Data de início<Input type="date" value={start} max={end || undefined} onChange={e => setStart(e.target.value)}/></label><label>Data de fim<Input type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)}/></label></div>{!valid && <p className="report-validation" role="alert">Informe uma data de início igual ou anterior à data de fim.</p>}</section>
    {valid && <><section className="stats report-stats">{[[ArrowLeftRight, 'Empréstimos', selected.length, 'retiradas no período'], [Users, 'Alunos', people.length, 'alunos diferentes'], [BookOpen, 'Devolvidos', selected.filter(loan => loan.status === 'Devolvido').length, 'empréstimos concluídos']].map(([Icon, label, value, description]: any) => <article className="stat" key={label}><div><span>{label}</span><Icon size={20}/></div><strong>{loading ? '—' : value.toLocaleString('pt-BR')}</strong><small>{description}</small></article>)}</section><section className="panel"><div className="panel-heading"><div><h2>Empréstimos por aluno</h2><p>De {formatDate(start)} a {formatDate(end)} · {people.length} {people.length === 1 ? 'aluno' : 'alunos'}</p></div></div>{loading ? <p className="loading">Carregando registros…</p> : <BorrowerTable loans={selected}/>}</section></>}
  </>;
}

const periods: {value: RankingPeriod; label: string}[] = [{value: 'week', label: 'Esta semana'}, {value: 'month', label: 'Este mês'}, {value: 'year', label: 'Este ano'}, {value: 'all', label: 'Todo o período'}];

export function RankingPanel({loans, loading}: {loans: ReportLoan[]; loading: boolean}) {
  const [period, setPeriod] = useState<RankingPeriod>('month');
  const today = new Date();
  const selected = loansInPeriod(loans, rankingStart(period, today), period === 'all' ? '9999-12-31' : localDate(today));
  const people = borrowersFor(selected);
  return <>
    <div className="page-heading"><div><span className="eyebrow">LEITORES DA BIBLIOTECA</span><h1>Ranking de leitores</h1><p>Todos os alunos ordenados pela quantidade de livros retirados.</p></div><Medal className="report-heading-icon" size={32}/></div>
    <section className="panel"><div className="panel-heading"><div><h2>Período do ranking</h2><p>Os empréstimos contam pela data de entrega registrada.</p></div></div><div className="ranking-periods" role="group" aria-label="Selecionar período do ranking">{periods.map(option => <button key={option.value} type="button" className={period === option.value ? 'selected' : ''} aria-pressed={period === option.value} onClick={() => setPeriod(option.value)}>{option.label}</button>)}</div></section>
    <section className="stats report-stats">{[[Users, 'Alunos no ranking', people.length, 'com empréstimos no período'], [ArrowLeftRight, 'Empréstimos', selected.length, 'retiradas registradas'], [BarChart3, 'Maior quantidade', people[0]?.loans.length || 0, 'livros por aluno']].map(([Icon, label, value, description]: any) => <article className="stat" key={label}><div><span>{label}</span><Icon size={20}/></div><strong>{loading ? '—' : value.toLocaleString('pt-BR')}</strong><small>{description}</small></article>)}</section>
    <section className="panel"><div className="panel-heading"><div><h2>Classificação completa</h2><p>{periods.find(option => option.value === period)?.label} · {people.length} {people.length === 1 ? 'aluno' : 'alunos'}</p></div></div>{loading ? <p className="loading">Carregando registros…</p> : <BorrowerTable loans={selected} ranking/>}</section>
  </>;
}
