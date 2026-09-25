"use client";

import {Star, UserRound, UsersRound} from 'lucide-react';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';

const team = [
  {name: 'Marcos Emanuel', role: 'Desenvolvedor', initials: 'ME'},
  {name: 'João Guilherme', role: 'Organização do Acervo', initials: 'JG'},
  {name: 'Benedito Ribeiro', role: 'Organização do Acervo', initials: 'BR'},
  {name: 'Davi Lucas', role: 'Colaborador de Catalogação', initials: 'DL'},
  {name: 'Flávio Levy', role: 'Colaborador de Catalogação', initials: 'FL'},
  {name: 'Jeremias', role: 'Colaborador', initials: 'JE'},
];

const thanks = ['João Mateus', 'Abraão Lucas', 'Yzis Gabrieli', 'Elison Carlos', 'Isabely Vitória'];

export default function InfoDialog({open, onOpenChange}: {open: boolean; onOpenChange: (open: boolean) => void}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="info-dialog" aria-describedby="sgb-license" showCloseButton={false}>
      <div className="info-dialog-header">
        <DialogClose className="info-close" aria-label="Fechar informações">×</DialogClose>
        <DialogTitle className="sr-only">Sobre o SGB</DialogTitle>
        <div className="info-brand-mark"><img src="/sgb-info-logo.webp" alt="SGB"/></div>
        <DialogDescription id="sgb-license">Licenciado para: Escolas Seduc PI</DialogDescription>
      </div>
      <div className="info-dialog-body">
        <section aria-labelledby="info-team-title">
          <div className="info-section-title"><UsersRound aria-hidden="true"/><h2 id="info-team-title">Equipe</h2><span/></div>
          <ul className="info-team-list">{team.map(person => <li key={person.initials}>
            <span className="info-avatar" aria-hidden="true">{person.initials}</span>
            <span className="info-person"><strong>{person.name}</strong><small>{person.role}</small></span>
          </li>)}</ul>
        </section>
        <section aria-labelledby="info-thanks-title">
          <div className="info-section-title"><Star aria-hidden="true"/><h2 id="info-thanks-title">Agradecimentos</h2><span/></div>
          <ul className="info-thanks-list">{thanks.map(name => <li key={name}><UserRound aria-hidden="true" size={18}/>{name}</li>)}</ul>
        </section>
      </div>
      <div className="info-dialog-footer">SGB · Versão 1.0.0</div>
    </DialogContent>
  </Dialog>;
}
