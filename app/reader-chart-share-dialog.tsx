'use client';
/* eslint-disable @next/next/no-img-element -- A prévia usa um PNG gerado localmente, sem serviço de imagens. */
import {useEffect,useState} from 'react';
import {Download,Share2} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {readerChartPng,type ReaderChartReport} from './reader-chart-share';
const date=(value:string)=>value.split('-').reverse().join('/');
export default function ReaderChartShareDialog({report,onClose}:{report:ReaderChartReport;onClose:()=>void}){
 const [prepared,setPrepared]=useState<{file:File;url:string;native:boolean}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[sharing,setSharing]=useState(false);
 useEffect(()=>{
  let active=true,url='';
  void readerChartPng(report).then(file=>{if(!active)return;url=URL.createObjectURL(file);let native=false;try{native=typeof navigator.share==='function'&&!!navigator.canShare?.({files:[file]})}catch{/* O download continua disponível. */}setPrepared({file,url,native})}).catch(reason=>{if(active)setError((reason as Error).message)});
  return()=>{active=false;if(url)URL.revokeObjectURL(url)};
 },[report]);
 function download(){if(!prepared)return;const link=document.createElement('a');link.href=prepared.url;link.download=prepared.file.name;document.body.appendChild(link);link.click();link.remove();setMessage('Imagem baixada. Você pode enviá-la ao professor.')}
 async function share(){
  if(!prepared||sharing)return;setSharing(true);setError('');
  try{await navigator.share({files:[prepared.file],title:'SGB · Alunos que mais leram livros'});setMessage('Imagem compartilhada.')}
  catch(reason){if((reason as Error).name!=='AbortError')setError('Não foi possível abrir o compartilhamento. Use Baixar imagem.')}
  finally{setSharing(false)}
 }
 return <Dialog open onOpenChange={open=>{if(!open&&!sharing)onClose()}}><DialogContent className="reader-share-dialog" showCloseButton={!sharing}><DialogHeader><DialogTitle>Compartilhar gráfico</DialogTitle><DialogDescription>Período: {date(report.start)} a {date(report.end)} · {report.grade||'Todas as turmas'}</DialogDescription></DialogHeader>{prepared?<div className="reader-share-preview"><img src={prepared.url} alt="Prévia do gráfico para compartilhar"/></div>:!error&&<p role="status">Preparando imagem…</p>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="reader-share-message" role="status">{message}</p>}{prepared&&!prepared.native&&<p className="reader-share-help">Baixe a imagem para enviar pelo WhatsApp, e-mail ou outro aplicativo.</p>}<div className="form-footer"><Button variant="outline" disabled={sharing} onClick={onClose}>Fechar</Button><Button className="primary" disabled={!prepared||sharing} onClick={download}><Download size={16}/>Baixar imagem</Button>{prepared?.native&&<Button className="primary" disabled={sharing} onClick={()=>void share()}><Share2 size={16}/>{sharing?'Compartilhando…':'Compartilhar'}</Button>}</div></DialogContent></Dialog>;
}
