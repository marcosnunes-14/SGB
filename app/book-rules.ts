export function canClone(role:string){return role==='desenvolvedor'}
export function normalizeBook(data:Record<string,string>){
 const fields=['registration','copies','type','cdd','authors','title','local','publisher','year','pages','rack','shelf'];
 const book:Record<string,string>={};
 for(const key of fields){const value=data[key]??'';if(typeof value!=='string'||value.length>1000)throw Error('Dados inválidos.');book[key]=value.trim()}
 if(!book.registration||book.registration.length>100||!book.title||!book.authors)throw Error('Preencha registro, título e autor(es).');
 for(const [key,max] of [['copies',100000],['rack',12],['shelf',5]] as const){if(!Number.isInteger(+book[key])||+book[key]<1||+book[key]>max)throw Error('Confira os exemplares e a localização.')}
 if(book.pages&&(!Number.isInteger(+book.pages)||+book.pages<1))throw Error('Informe um número de páginas válido.');
 return book;
}
export function deletionSql(count:number){const placeholders=Array(count).fill('?').join(',');return `DELETE FROM books WHERE owner=? AND id IN (${placeholders}) AND NOT EXISTS (SELECT 1 FROM books b JOIN loans l ON l.owner=b.owner AND TRIM(json_extract(l.data,'$.code'))=b.registration WHERE b.owner=? AND b.id IN (${placeholders}) AND json_extract(l.data,'$.status')!='Devolvido')`}
export const editSql="UPDATE books SET registration=?,data=? WHERE id=? AND owner=? AND (registration=? OR NOT EXISTS(SELECT 1 FROM loans l WHERE l.owner=books.owner AND TRIM(json_extract(l.data,'$.code'))=books.registration AND json_extract(l.data,'$.status')!='Devolvido'))";
