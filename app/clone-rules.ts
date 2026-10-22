import {normalizeBook} from './book-rules';
export const cloneFields=[
 ['title','Título','text'],['authors','Autor(es)','text'],['cdd','CDD','text'],['type','Tipo da obra','text'],
 ['publisher','Editora','text'],['year','Ano / Publicação','text'],['local','Local','text'],['pages','Nº de páginas','number'],
 ['copies','Exemplares por clone','number'],['rack','Estante','number'],['shelf','Prateleira','number']
] as const;
export function normalizeCloneOverrides(input:unknown){
 if(input===undefined)return {} as Record<string,string>;
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Os dados dos clones são inválidos.');
 const values:Record<string,string>={};
 for(const [key,value] of Object.entries(input)){
  if(!cloneFields.some(([field])=>field===key)||typeof value!=='string'||value.length>1000)throw Error('Selecione somente campos válidos do livro para alterar.');
  values[key]=value;
 }
 const normalized=normalizeBook({registration:'1',title:'Livro',authors:'Autor',copies:'1',rack:'1',shelf:'1',...values});
 return Object.fromEntries(Object.keys(values).map(key=>[key,['copies','rack','shelf','pages'].includes(key)&&normalized[key]!==''?String(Number(normalized[key])):normalized[key]]));
}
