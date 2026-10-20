export const MAX_MOVE_BOOKS = 50;

export function normalizeBookMove(input:{ids?:unknown;rack?:unknown;shelf?:unknown}){
 const {ids}=input;
 if(!Array.isArray(ids)||!ids.length||ids.length>MAX_MOVE_BOOKS||ids.some(id=>typeof id!=='string'||!id.trim()||id.length>100))throw Error('Selecione de 1 a 50 livros para mover.');
 const coordinate=(value:unknown,max:number)=>{
  if(typeof value!=='number'&&typeof value!=='string')throw Error('Escolha uma estante e uma prateleira válidas.');
  if(typeof value==='string'&&!/^\d{1,2}$/.test(value))throw Error('Escolha uma estante e uma prateleira válidas.');
  const number=Number(value);
  if(!Number.isInteger(number)||number<1||number>max)throw Error('Escolha uma estante de 1 a 12 e uma prateleira de 1 a 5.');
  return String(number);
 };
 return {ids:[...new Set(ids)] as string[],rack:coordinate(input.rack,12),shelf:coordinate(input.shelf,5)};
}

// Um único UPDATE: se faltar um livro ou houver outra escola no lote, nada é movido.
// json_each mantém o número de parâmetros baixo mesmo com os 50 livros selecionados.
export const moveBooksSql=`UPDATE books SET data=json_set(data,'$.rack',?,'$.shelf',?)
 WHERE owner=? AND id IN (SELECT value FROM json_each(?))
 AND (SELECT COUNT(*) FROM books WHERE owner=? AND id IN (SELECT value FROM json_each(?)))=?`;

export function selectBookPage(current:string[],page:string[],checked:boolean,limit:number){
 return checked?[...new Set([...current,...page])].slice(0,limit):current.filter(id=>!page.includes(id));
}
export function selectBook(current:string[],id:string,checked:boolean,limit:number){
 return checked?[...new Set([...current,id])].slice(0,limit):current.filter(value=>value!==id);
}
