import LabelBarcode from './label-barcode';
import {labelSizes,type LabelBook,type LabelSize} from './label-rules';
export default function BookLabel({book,school,size}:{book:LabelBook;school:string;size:LabelSize}){
 const dimensions=labelSizes[size];
 return <article className="book-label" style={{width:dimensions.width+'mm',height:dimensions.height+'mm'}}><strong className="label-brand">SGB</strong><span className="label-school">{school}</span><LabelBarcode code={book.code}/><span className="label-code">{book.code}</span><strong className="label-title">{book.title}</strong><span className="label-registration">Registro: {book.registration}</span></article>
}
