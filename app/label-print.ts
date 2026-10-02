import {validLabelSize,type LabelSize} from './label-rules';
export function openLabelPrint(ids:string[],size:LabelSize){
 if(!ids.length||!validLabelSize(size))return false;
 const popup=window.open('about:blank','_blank');if(!popup)return false;
 try{const key=crypto.randomUUID();popup.sessionStorage.setItem('sgb-label-print-'+key,JSON.stringify({ids,size}));popup.opener=null;popup.location.replace('/etiquetas/imprimir?selecao='+encodeURIComponent(key));return true}catch{popup.close();return false}
}
