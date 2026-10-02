import {redirect} from 'next/navigation';
import {getUser} from '../../auth';
import LabelPrintPage from './print-page';
export const dynamic='force-dynamic';
export const metadata={title:'Imprimir etiquetas | SGB'};
export default async function Page(){const user=await getUser();if(!user)redirect('/');if(!user.institutionId)redirect('/admin');return <LabelPrintPage readonly={!['bibliotecario','desenvolvedor'].includes(user.role)}/>}
