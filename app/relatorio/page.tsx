import {redirect} from 'next/navigation';
import {BookOpen, CalendarDays, UsersRound} from 'lucide-react';
import {getUser} from '../auth';
import {database} from '@/db/raw';
import {borrowersFor, validReportPeriod, type ReportLoan} from '../loan-report';
import './report.css';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Relatório de leitores | SGB'};

function displayDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0][0] || ''}${parts.length > 1 ? parts.at(-1)?.[0] || '' : ''}`.toLocaleUpperCase('pt-BR');
}

export default async function ReportPage({searchParams}: {searchParams: Promise<{inicio?: string; fim?: string}>}) {
  const user = await getUser();
  if (!user) redirect('/');
  const {inicio, fim} = await searchParams;
  const start = inicio || '', end = fim || '';
  if (!validReportPeriod(start, end)) {
    return <main className="reader-report reader-report-error"><h1>Período inválido</h1><p>Escolha as datas de início e fim na aba Relatórios do SGB.</p><a href="/sistema">Voltar ao sistema</a></main>;
  }

  const rows = await database().prepare("SELECT id,data FROM loans WHERE owner=? AND json_extract(data,'$.delivery') BETWEEN ? AND ? ORDER BY json_extract(data,'$.delivery') DESC")
    .bind(user.userId, start, end).all<{id: string; data: string}>();
  const people = borrowersFor(rows.results.map(row => ({...JSON.parse(row.data) as ReportLoan, id: row.id})));

  return <main className="reader-report">
    <header className="reader-report-hero"><h1>RELATÓRIOS</h1><p><span/>SGB<span/></p></header>
    <div className="reader-report-content">
      <div className="reader-report-summary"><div className="reader-report-period"><span className="reader-report-calendar"><CalendarDays size={24}/></span><div><strong>Período do relatório</strong><small>{displayDate(start)} até {displayDate(end)}</small></div></div><span className="reader-report-count"><UsersRound size={19}/>{people.length} {people.length === 1 ? 'pessoa' : 'pessoas'} no relatório</span></div>
      {people.length ? <ol className="reader-report-list">{people.map((person, index) => <li key={`${person.name}-${person.grade}`} className={index === 0 ? 'reader-report-first' : ''}><span className={`reader-report-rank reader-report-rank-${Math.min(index + 1, 4)}`}>{index + 1}º</span><span className="reader-report-avatar" aria-hidden="true">{initials(person.name)}</span><strong>{person.name}</strong><span className="reader-report-books"><BookOpen size={19}/>{person.loans.length} {person.loans.length === 1 ? 'livro' : 'livros'}</span></li>)}</ol> : <div className="reader-report-empty">Nenhum empréstimo foi registrado neste período.</div>}
    </div>
  </main>;
}
