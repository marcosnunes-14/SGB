// Identidade exata: espaços, caixa e acentos não criam outra ficha. Não há busca aproximada.
export function cleanStudentText(value:string){return value.trim().replace(/\s+/gu,' ')}
export function studentKey(value:string){return cleanStudentText(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR')}
export function studentCode(id:number){return `ALU-${String(id).padStart(6,'0')}`}
