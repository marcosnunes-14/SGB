const numericRegistration=/^\d+$/;
const natural=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});

/** Maior registro primeiro, inclusive quando foi cadastrado antes dos demais. */
export function compareRegistrations(a:string,b:string){
 const left=a.trim(),right=b.trim(),leftNumber=numericRegistration.test(left),rightNumber=numericRegistration.test(right);
 if(leftNumber&&rightNumber){const x=BigInt(left),y=BigInt(right);if(x!==y)return x>y?-1:1}
 if(leftNumber!==rightNumber)return leftNumber?-1:1;
 return natural.compare(right,left)||right.localeCompare(left,'pt-BR');
}
