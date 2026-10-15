'use client';

import { useState, InputHTMLAttributes } from 'react';

// Champ mot de passe avec bouton pour afficher la saisie et la vérifier
export default function PasswordInput({ className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-24`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 z-20 px-3 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {visible ? 'Masquer' : 'Afficher'}
      </button>
    </div>
  );
}
