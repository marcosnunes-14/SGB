export const labelSizes={'50x30':{width:50,height:30},'50x25':{width:50,height:25},'40x30':{width:40,height:30}} as const;
export type LabelSize=keyof typeof labelSizes;
export type LabelBook={id:string;bookId:string;copyNumber:number;code:string;registration:string;title:string;authors:string;printCount:number;lastPrintedAt:string|null};
export type LabelsResponse={books:LabelBook[];school:string;error?:string};
export function validLabelSize(value:unknown):value is LabelSize{return typeof value==='string'&&Object.hasOwn(labelSizes,value)}
export function labelSearch(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}
export function filterLabels(books:LabelBook[],query:string,filter:string){const key=labelSearch(query);return books.filter(b=>(filter==='unprinted'?b.printCount===0:filter==='printed'?b.printCount>0:true)&&labelSearch([b.title,b.registration,b.authors,b.code].join(' ')).includes(key))}
export function labelIds(value:unknown):string[]{if(!Array.isArray(value)||!value.length||value.length>5000||value.some(id=>typeof id!=='string'||!id||id.length>100))throw Error('Selecione de 1 a 5.000 exemplares.');return [...new Set(value)]}
