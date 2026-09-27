import {redirect} from 'next/navigation';
import {getUser} from '../auth';
import AdminConsole from './admin-console';
import './admin.css';

export const dynamic='force-dynamic';
export default async function AdminPage(){const user=await getUser();if(!user)redirect('/');if(user.role!=='desenvolvedor')redirect('/sistema');return <AdminConsole username={user.username}/>}
