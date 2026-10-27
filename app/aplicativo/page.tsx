import OfflineApp from '../offline/app';
export const dynamic='force-dynamic';
export const metadata={title:'Aplicativo SGB',manifest:'/manifest.webmanifest'};
// Esta página é uma estrutura pública, sem dados de usuário no HTML ou no cache do Service Worker.
export default function AppPage(){return <OfflineApp/>}
