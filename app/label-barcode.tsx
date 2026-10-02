import JsBarcode from 'jsbarcode';
export function encodeLabel(code:string){
 const target:{encodings?:{data:string}[]}={};
 JsBarcode(target,code,{format:'CODE128',displayValue:false,width:1,height:40,margin:10});
 const data=target.encodings?.map(e=>e.data).join('');if(!data)throw Error('Código de barras inválido.');return data;
}
export default function LabelBarcode({code}:{code:string}){
 const data=encodeLabel(code),quiet=10;let path='';
 for(let i=0;i<data.length;i++){if(data[i]!=='1')continue;const start=i;while(data[i+1]==='1')i++;const width=i-start+1;path+=`M${start+quiet} 0h${width}v40h-${width}z`;}
 return <svg className="label-barcode" role="img" aria-label={'Código de barras '+code} viewBox={`0 0 ${data.length+quiet*2} 40`} preserveAspectRatio="none"><rect width={data.length+quiet*2} height="40" fill="white"/><path d={path} fill="black"/></svg>
}
