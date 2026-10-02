import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import JsBarcode from 'jsbarcode';
const jsxRuntime=import.meta.resolve('react/jsx-runtime');
function compile(source){const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replaceAll('"react/jsx-runtime"',JSON.stringify(jsxRuntime));return 'data:text/javascript;base64,'+Buffer.from(output).toString('base64')}
const slots=[],effects=[];let index=0,pending=[];
globalThis.__hooks={useState(initial){const i=index++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},useRef(value){const i=index++;return slots[i]??=({current:value})},useEffect(fn,deps){const i=index++;if(!effects[i]||deps.some((value,j)=>value!==effects[i].deps[j])){effects[i]?.cleanup?.();pending.push(()=>{effects[i]={deps,cleanup:fn()}})}},useMemo(fn){index++;return fn()}};
const events=new Map();globalThis.document={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name)}};
const source=readFileSync('app/extra-menu.tsx','utf8').replace(/^import .*;\n/gm,'');
const {default:ExtraMenu}=await import(compile('const {useState,useRef,useEffect}=globalThis.__hooks;const Menu="menu-icon",ChevronRight="arrow-icon";\n'+source));
let selected=false;const props={books:[],loans:[],loading:false,onReports(){},onLabels(){selected=true}};
const render=()=>{index=0;const tree=ExtraMenu(props);tree.props.ref.current={contains:target=>target==='inside'};const tasks=pending;pending=[];tasks.forEach(f=>f());return tree};
function flatten(node){if(!node||typeof node!=='object')return [];const children=node.props?.children;return [node,...(Array.isArray(children)?children.flat(Infinity):[children]).flatMap(flatten)]}
let tree=render();assert.equal(tree.props.onMouseLeave,undefined);assert.equal(tree.props.onMouseOut,undefined);assert.equal(tree.props.onMouseEnter,undefined);
flatten(tree).find(n=>n.props?.className==='extra-menu-trigger').props.onClick();tree=render();assert.ok(flatten(tree).some(n=>n.props?.role==='menu'));
// Entrar/sair do submenu não modifica o estado de abertura.
flatten(tree).find(n=>n.props?.className==='extra-menu-group').props.onMouseEnter();tree=render();assert.ok(flatten(tree).some(n=>n.props?.className==='extra-submenu'));
events.get('click')({target:'inside'});tree=render();assert.ok(flatten(tree).some(n=>n.props?.role==='menu'));
flatten(tree).find(n=>n.props?.children==='Etiquetas e códigos').props.onClick();tree=render();assert.ok(selected);assert.ok(!flatten(tree).some(n=>n.props?.role==='menu'));
flatten(tree).find(n=>n.props?.className==='extra-menu-trigger').props.onClick();tree=render();events.get('click')({target:'outside'});tree=render();assert.ok(!flatten(tree).some(n=>n.props?.role==='menu'));
flatten(tree).find(n=>n.props?.className==='extra-menu-trigger').props.onClick();tree=render();flatten(tree).find(n=>n.props?.className==='extra-menu-trigger').props.onClick();tree=render();assert.ok(!flatten(tree).some(n=>n.props?.role==='menu'));
const rules=await import(compile(readFileSync('app/label-rules.ts','utf8')));globalThis.__JsBarcode=JsBarcode;
const barcode=await import(compile(readFileSync('app/label-barcode.tsx','utf8').replace("import JsBarcode from 'jsbarcode';",'const JsBarcode=globalThis.__JsBarcode;')));
globalThis.__LabelBarcode=barcode.default;globalThis.__labelSizes=rules.labelSizes;
const labelSource=readFileSync('app/book-label.tsx','utf8').replace(/^import .*;\n/gm,'');
const {default:BookLabel}=await import(compile('const LabelBarcode=globalThis.__LabelBarcode,labelSizes=globalThis.__labelSizes;\n'+labelSource));
const book={id:'1',bookId:'b',copyNumber:1,code:'SGB-0001-000001',registration:'1847',title:'O Pequeno Príncipe',authors:'Antoine',printCount:0,lastPrintedAt:null};
for(const [size,dimensions] of Object.entries(rules.labelSizes)){const html=renderToStaticMarkup(BookLabel({book,school:'Escola A',size}));assert.ok(html.includes(`width:${dimensions.width}mm;height:${dimensions.height}mm`));assert.ok(html.includes('<svg'));assert.ok(html.includes('SGB-0001-000001'));assert.ok(html.includes('Registro: 1847'));}
const batch=Array.from({length:30},(_,i)=>renderToStaticMarkup(BookLabel({book:{...book,code:'SGB-0001-'+String(i+1).padStart(6,'0')},school:'Escola A',size:'50x30'}))).join('');assert.equal((batch.match(/<article/g)||[]).length,30);assert.equal((batch.match(/<svg/g)||[]).length,30);
const storage=new Map();let location='';globalThis.window={open:()=>({sessionStorage:{setItem:(k,v)=>storage.set(k,v)},opener:{},location:{replace:value=>location=value},close(){}})};
globalThis.__validLabelSize=rules.validLabelSize;
const printSource=readFileSync('app/label-print.ts','utf8').replace(/^import .*;\n/gm,'');const {openLabelPrint}=await import(compile('const validLabelSize=globalThis.__validLabelSize;\n'+printSource));
assert.ok(openLabelPrint(['1','2'],'40x30'));assert.match(location,/^\/etiquetas\/imprimir\?selecao=/);assert.deepEqual(JSON.parse([...storage.values()][0]),{ids:['1','2'],size:'40x30'});
window.open=()=>null;assert.equal(openLabelPrint(['1'],'50x30'),false);
const css=readFileSync('app/etiquetas/imprimir/print.css','utf8');assert.ok(css.includes('@media print'));assert.ok(css.includes('.label-print-controls{display:none!important}'));assert.ok(css.includes('break-after:page'));
console.log('PASS: abertura/fechamento do menu por clique, submenu persistente, clique fora, seleção de opção, 3 tamanhos, 30 etiquetas renderizadas, nova janela e bloqueio de pop-up.');
