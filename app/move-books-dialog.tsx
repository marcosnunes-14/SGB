"use client";

import {useState,type FormEvent} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {MAX_MOVE_BOOKS} from './book-move-rules';

type Book={id:string;registration:string;title:string;rack:string;shelf:string};
export default function MoveBooksDialog({ids,books,onClose,onSaved}:{ids:string[];books:Book[];onClose:()=>void;onSaved:(count:number)=>void}){
 const [rack,setRack]=useState(''),[shelf,setShelf]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!rack||!shelf||!ids.length||ids.length>MAX_MOVE_BOOKS)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'move',ids,rack,shelf})});
   const result=await response.json() as {error?:string;count:number};
   if(!response.ok)throw Error(result.error||'Não foi possível mover os livros.');
   onSaved(result.count);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="record-dialog move-books-dialog" showCloseButton={!busy}><DialogHeader><DialogTitle>Mover {ids.length} {ids.length===1?'livro':'livros'}</DialogTitle><DialogDescription>Escolha a estante e a prateleira de destino. Os demais dados dos livros serão mantidos.</DialogDescription></DialogHeader><form onSubmit={save}><div className="move-destination"><label>Estante de destino<select aria-label="Estante de destino" required value={rack} disabled={busy} onChange={e=>setRack(e.target.value)}><option value="" disabled>Selecione a estante</option>{Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>Estante {String(n).padStart(2,'0')}</option>)}</select></label><label>Prateleira de destino<select aria-label="Prateleira de destino" required value={shelf} disabled={busy} onChange={e=>setShelf(e.target.value)}><option value="" disabled>Selecione a prateleira</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>Prateleira {n}</option>)}</select></label></div><details className="move-books-list"><summary>Livros selecionados ({ids.length})</summary><ul>{ids.map(id=>{const book=books.find(b=>b.id===id);return <li key={id}>{book?`${book.registration} — ${book.title} · Estante ${book.rack||'—'}, prateleira ${book.shelf||'—'}`:'Livro indisponível na lista atual'}</li>})}</ul></details>{rack&&shelf&&<p className="move-destination-summary" role="status">Destino: <strong>Estante {String(rack).padStart(2,'0')} · Prateleira {shelf}</strong></p>}{error&&<p className="error" role="alert">{error}</p>}<div className="form-footer"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" className="primary" disabled={busy||!rack||!shelf||!ids.length||ids.length>MAX_MOVE_BOOKS}>{busy?'Movendo…':'Confirmar mudança'}</Button></div></form></DialogContent></Dialog>;
}
