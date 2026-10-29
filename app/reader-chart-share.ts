export type SharedReader={id:string;name:string;grade:string;total:number};
export type ReaderChartReport={school:string;start:string;end:string;grade:string;readers:SharedReader[]};
const xml=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
const date=(value:string)=>value.split('-').reverse().join('/');
// Quebra inclusive palavras longas, mantendo todos os nomes sem cortar a imagem.
function lines(text:string,limit:number){
 const result:string[]=[];let current='';
 for(const word of text.trim().replace(/\s+/gu,' ').split(' ')){
  if(!word)continue;
  const parts=Array.from(word);while(parts.length>limit){if(current){result.push(current);current=''}result.push(parts.splice(0,limit).join(''))}
  const rest=parts.join('');if(!rest)continue;
  if(current&&Array.from(current+' '+rest).length>limit){result.push(current);current=''}current+=(current?' ':'')+rest;
 }
 if(current)result.push(current);return result;
}
export const readerChartFilename=(report:ReaderChartReport)=>`sgb-leitores-${report.start}-a-${report.end}.png`;
export function readerChartImage(report:ReaderChartReport){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(report.start)||!/^\d{4}-\d{2}-\d{2}$/.test(report.end)||report.start>report.end)throw Error('Confira o período do gráfico.');
 const readers=report.readers.slice(0,10);
 if(!readers.length||readers.some(reader=>!reader.name.trim()||!Number.isSafeInteger(reader.total)||reader.total<1))throw Error('Não há leitores para compartilhar neste período.');
 const width=1200,padding=56,parts:string[]=[];
 const text=(x:number,y:number,value:string,size=18,color='#526a7d',weight=400,anchor='start')=>parts.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${xml(value)}</text>`);
 parts.push('<rect width="1200" height="8" fill="#17618d"/>');
 text(padding,57,'SGB',25,'#17618d',700);text(padding,104,'Alunos que mais leram livros',30,'#163c57',700);
 let y=140;
 for(const line of lines(report.school||'Sistema de Gestão Bibliotecária',58)){text(padding,y,line,19);y+=26}
 text(padding,y+6,`Período: ${date(report.start)} a ${date(report.end)}`,19,'#163c57',600);y+=38;
 for(const line of lines(report.grade?`Turma: ${report.grade}`:'Todas as turmas',65)){text(padding,y,line,17);y+=24}
 const left=104,right=1128,top=y+38,plotHeight=270,bottom=top+plotHeight;
 const largest=Math.max(...readers.map(reader=>reader.total)),step=Math.max(1,Math.ceil(largest/4)),maximum=Math.ceil(largest/step)*step;
 for(let value=0;value<=maximum;value+=step){const row=bottom-value/maximum*plotHeight;parts.push(`<line x1="${left}" x2="${right}" y1="${row}" y2="${row}" stroke="#e9eef3"/>`);text(left-18,row+5,String(value),15,'#607387',400,'end')}
 const points=readers.map((reader,index)=>({x:readers.length===1?(left+right)/2:left+index*(right-left)/(readers.length-1),y:bottom-reader.total/maximum*plotHeight}));
 let path=`M ${points[0].x} ${points[0].y}`;
 for(let i=1;i<points.length;i++){const previous=points[i-1],point=points[i],mid=(previous.x+point.x)/2;path+=` C ${mid} ${previous.y}, ${mid} ${point.y}, ${point.x} ${point.y}`}
 parts.push(`<path d="${path}" fill="none" stroke="#17618d" stroke-width="3"/>`);
 for(let i=0;i<readers.length;i++){const reader=readers[i],point=points[i];parts.push(`<circle cx="${point.x}" cy="${point.y}" r="5" fill="#fff" stroke="#17618d" stroke-width="2"/>`);text(point.x,point.y-15,String(reader.total),16,'#1b587f',600,'middle');text(point.x,bottom+28,`${i+1}º`,14,'#607387',400,'middle');const first=reader.name.trim().split(/\s+/u)[0];text(point.x,bottom+49,Array.from(first).slice(0,10).join(''),12,'#607387',400,'middle')}
 y=bottom+98;text(padding,y,'Leitores do período',21,'#163c57',700);text(1128,y,'Livros devolvidos',16,'#526a7d',600,'end');y+=30;
 for(let i=0;i<readers.length;i++){
  const reader=readers[i],name=lines(reader.name.toLocaleUpperCase('pt-BR'),48),grade=lines(reader.grade||'Turma não informada',60),rowHeight=Math.max(66,name.length*25+grade.length*21+22);
  parts.push(`<line x1="${padding}" x2="1144" y1="${y-6}" y2="${y-6}" stroke="#e9eef3"/>`);
  text(padding,y+20,String(i+1).padStart(2,'0'),17,'#8092a1');
  name.forEach((line,index)=>text(100,y+20+index*25,line,18,'#2b4253',600));
  grade.forEach((line,index)=>text(100,y+20+name.length*25+index*21,line,16));
  text(1128,y+20,`${reader.total} ${reader.total===1?'livro':'livros'}`,18,'#1b587f',600,'end');y+=rowHeight;
 }
 y+=24;text(padding,y,'Critério: livros devolvidos. O período considera a data da retirada.',15);y+=24;
 text(padding,y,'A devolução não confirma que a leitura foi concluída.',15);y+=36;
 text(padding,y,'SGB · Sistema de Gestão Bibliotecária',14,'#8092a1');
 const height=y+38;
 return {width,height,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial, Helvetica, sans-serif"><rect width="100%" height="100%" fill="#fff"/>${parts.join('')}</svg>`};
}
export async function readerChartPng(report:ReaderChartReport){
 const {width,height,svg}=readerChartImage(report),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('Não foi possível preparar a imagem do gráfico.'));image.src=url});
  const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
  const context=canvas.getContext('2d');if(!context)throw Error('Este navegador não conseguiu gerar a imagem.');
  context.scale(2,2);context.drawImage(image,0,0,width,height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Não foi possível salvar a imagem.')),'image/png'));
  return new File([blob],readerChartFilename(report),{type:'image/png'});
 }finally{URL.revokeObjectURL(url)}
}
