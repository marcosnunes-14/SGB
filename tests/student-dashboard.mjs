import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const identitySource=await readFile('app/student-identity.ts','utf8');
const dashboardSource=(await readFile('app/dashboard-data.ts','utf8')).replace("import {studentKey,studentCode} from './student-identity';",'');
const js=ts.transpileModule(identitySource+'\n'+dashboardSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const identity=module,dashboard=module;
assert.equal(identity.studentKey(' Marcos  EMANUEL Nunes Soares '),identity.studentKey('marcos emanuel nunes soares'));
assert.equal(identity.studentKey('MÁRCOS Emanuel'),identity.studentKey('Marcos Emanuel'));
assert.notEqual(identity.studentKey('Marcos Emanuel Nunes Soare'),identity.studentKey('Marcos Emanuel Nunes Soares'));
assert.notEqual(identity.studentKey('2º A DS'),identity.studentKey('3º A DS'));
const rows=[
 {student_id:1,data:JSON.stringify({student:'Marcos Emanuel',grade:'2º A DS',title:'Livro A',author:'Autor',delivery:'2026-09-27',due:'2026-10-01',status:'Emprestado'})},
 {student_id:1,data:JSON.stringify({student:'MARCOS EMANUEL',grade:'2º A DS',title:'Livro A',author:'Autor',delivery:'2026-09-28',due:'2026-09-29',status:'Devolvido'})},
 {student_id:2,data:JSON.stringify({student:'Maria',grade:'1º B',title:'Livro B',author:'Autora',delivery:'2026-09-28',due:'2026-09-29',status:'Emprestado'})}
];
const students=[{id:1,name:'Marcos Emanuel',grade:'2º A DS'},{id:2,name:'Maria',grade:'1º B'}];
const filters={start:'2026-09-27',end:'2026-09-28',grade:'',status:'todos',today:'2026-09-28'};
const all=dashboard.summarizeDashboard(rows,students,filters);
assert.deepEqual(all.metrics,{loans:3,students:2,books:2,active:2});
assert.equal(all.topStudents[0].id,'ALU-000001');assert.equal(all.topStudents[0].total,2);
assert.deepEqual(all.timeline.map(d=>d.total),[1,2]);
assert.equal(all.grades.find(g=>g.grade==='2º A DS').total,2);
assert.equal(dashboard.summarizeDashboard(rows,students,{...filters,start:'2026-09-28'}).metrics.loans,2);
assert.equal(dashboard.summarizeDashboard(rows,students,{...filters,grade:identity.studentKey('2º a ds')}).metrics.students,1);
assert.equal(dashboard.summarizeDashboard(rows,students,{...filters,status:'devolvidos'}).metrics.loans,1);
assert.equal(dashboard.summarizeDashboard(rows,students,{...filters,status:'ativos'}).metrics.loans,2);
assert.equal(dashboard.summarizeDashboard(rows,students,{...filters,status:'atrasados',today:'2026-10-02'}).metrics.loans,2);
assert.equal(dashboard.summarizeDashboard(rows,students,{...filters,start:'2026-01-01',end:'2026-12-31'}).timeline.length,12);
const migration=await readFile('drizzle/0005_remarkable_masked_marvel.sql','utf8');
assert.match(migration,/ALTER TABLE `loans` ADD `student_id` integer/);
assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM|UPDATE books/i);
console.log('PASS: normalização exata, ranking por ID, séries, períodos, status e migração aditiva.');

const reading=dashboard.summarizeReadingDashboard(rows,students,filters);
assert.deepEqual(reading.metrics,{readings:1,readers:1,books:1});
assert.equal(reading.topReaders[0].id,'ALU-000001');assert.equal(reading.topReaders[0].total,1);assert.equal(reading.topReaders[0].name,'MARCOS EMANUEL');
assert.deepEqual(reading.timeline.map(day=>day.total),[0,1]);
assert.equal(reading.topReaders.some(reader=>reader.name==='MARIA'),false);
assert.equal(dashboard.summarizeReadingDashboard(rows,students,{...filters,start:'2026-09-27',end:'2026-09-27'}).metrics.readings,0);
assert.equal(dashboard.summarizeReadingDashboard(rows,students,{...filters,grade:identity.studentKey('1º B')}).metrics.readings,0);
const extraReturn={student_id:2,data:JSON.stringify({...JSON.parse(rows[2].data),status:'Devolvido'})};
const ranked=dashboard.summarizeReadingDashboard([...rows,extraReturn,extraReturn],students,filters);
assert.equal(ranked.topReaders[0].id,'ALU-000002');assert.equal(ranked.topReaders[0].total,2);assert.equal(ranked.metrics.readings,3);
assert.equal(dashboard.summarizeReadingDashboard([...rows,{student_id:999,data:extraReturn.data}],students,filters).topReaders.some(reader=>reader.id==='ALU-000999'),false);
console.log('PASS leitura: apenas devoluções entram no ranking, gráficos e indicadores; ordenação por leitor; maiúsculas; período/série; aluno sem vínculo válido não vira leitor de outra escola.');
