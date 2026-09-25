"use client";

import {useState} from 'react';
import {CalendarDays, ExternalLink} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {localDate, validReportPeriod} from './loan-report';

export function ReportsPanel() {
  const [start, setStart] = useState(() => {
    const now = new Date();
    return localDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [end, setEnd] = useState(() => localDate(new Date()));
  const valid = validReportPeriod(start, end);
  const url = `/relatorio?inicio=${encodeURIComponent(start)}&fim=${encodeURIComponent(end)}`;

  return <>
    <div className="page-heading"><div><span className="eyebrow">CIRCULAÇÃO DO ACERVO</span><h1>Relatórios</h1><p>Escolha as datas para gerar a lista de leitores e livros retirados.</p></div><CalendarDays className="report-heading-icon" size={32}/></div>
    <section className="panel report-filters" aria-label="Gerar relatório">
      <div className="panel-heading"><div><h2>Período do relatório</h2><p>Consideramos a data de entrega registrada em cada empréstimo. As duas datas estão incluídas.</p></div></div>
      <div className="report-date-fields"><label>Data de início<Input type="date" value={start} max={end || undefined} onChange={e => setStart(e.target.value)}/></label><label>Data de fim<Input type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)}/></label></div>
      {!valid && <p className="report-validation" role="alert">Informe uma data de início igual ou anterior à data de fim.</p>}
      <div className="report-generate"><a className="primary" href={valid ? url : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!valid} onClick={e => {if (!valid) e.preventDefault()}}><ExternalLink size={17}/>Gerar relatório</a><small>O relatório abre em uma nova aba do navegador.</small></div>
    </section>
  </>;
}
