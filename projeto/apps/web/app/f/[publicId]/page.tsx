'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, CheckCircle2, Loader2, Mail, Phone, User, Building2 } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { PublicForm } from '@/lib/types';

export default function PublicFormPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const [base, setBase] = useState({ name: '', company: '', phone: '', email: '' });
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [custom, setCustom] = useState<Record<string, string | boolean | string[]>>({});

  function formatPhoneBR(digits: string): string {
    const d = digits.slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `+55 (${d}`;
    if (d.length <= 7) return `+55 (${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11);
    setPhoneDisplay(formatPhoneBR(digits));
    setBase((b) => ({ ...b, phone: digits }));
  }

  function formatBRLInput(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseBRL(formatted: string): number {
    return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0;
  }

  useEffect(() => {
    let active = true;
    apiGet<{ form: PublicForm }>(`/public/forms/${publicId}`)
      .then((r) => active && setForm(r.form))
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [publicId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fields: Record<string, string | boolean | number | string[]> = {};
      for (const field of form?.fields ?? []) {
        const value = custom[field.key];
        if (value === undefined) continue;
        if (field.type === 'number') fields[field.key] = Number(value);
        else if (field.type === 'currency') fields[field.key] = parseBRL(value as string);
        else fields[field.key] = value;
      }
      await apiPost(`/public/forms/${publicId}/submit`, {
        name: base.name,
        company: base.company,
        phone: base.phone,
        email: base.email || undefined,
        fields,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <BarChart3 className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Formulário indisponível</h2>
        <p className="mt-2 text-sm text-gray-500">Este formulário foi desativado ou não existe.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">CRM NX</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {done ? (
          <div className="rounded-2xl bg-white px-8 py-16 text-center shadow-lg ring-1 ring-amber-100">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
              <CheckCircle2 className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Recebemos seu contato!</h2>
            <p className="mt-3 text-base text-gray-500">Em breve nossa equipe entrará em contato com você.</p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-50 px-5 py-2 text-sm font-medium text-amber-700">
              <CheckCircle2 className="h-4 w-4" /> Formulário enviado com sucesso
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-lg ring-1 ring-amber-100">
            {/* Form header */}
            <div className="rounded-t-2xl bg-gradient-to-r from-amber-400 to-yellow-400 px-8 py-8">
              <h1 className="text-2xl font-bold text-white">{form.name}</h1>
              {form.description && (
                <p className="mt-2 text-amber-50/90 text-sm">{form.description}</p>
              )}
            </div>

            <form onSubmit={submit} className="space-y-5 px-8 py-8">
              {/* Nome */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                  Nome completo <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    required
                    value={base.name}
                    onChange={(e) => setBase({ ...base, name: e.target.value })}
                    placeholder="Seu nome"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              {/* Empresa */}
              <div className="space-y-1.5">
                <label htmlFor="company" className="block text-sm font-semibold text-gray-700">
                  Nome da empresa <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="company"
                    type="text"
                    required
                    value={base.company}
                    onChange={(e) => setBase({ ...base, company: e.target.value })}
                    placeholder="Nome da sua empresa"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              {/* Telefone + Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                    Telefone <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={phoneDisplay}
                      onChange={handlePhoneChange}
                      placeholder="+55 (11) 99999-9999"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={base.email}
                      onChange={(e) => setBase({ ...base, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>
              </div>

              {/* Campos personalizados */}
              {form.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  {field.type === 'checkbox' && field.options && field.options.length > 0 ? (
                    <>
                      <p className="text-sm font-semibold text-gray-700">
                        {field.label} {field.required && <span className="text-amber-500">*</span>}
                      </p>
                      <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        {field.options.map((opt) => {
                          const arr = (custom[field.key] as string[] | undefined) ?? [];
                          return (
                            <label key={opt} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={arr.includes(opt)}
                                onChange={(e) =>
                                  setCustom({
                                    ...custom,
                                    [field.key]: e.target.checked
                                      ? [...arr, opt]
                                      : arr.filter((o) => o !== opt),
                                  })
                                }
                                className="h-4 w-4 rounded accent-amber-400"
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(custom[field.key])}
                        onChange={(e) => setCustom({ ...custom, [field.key]: e.target.checked })}
                        className="h-4 w-4 rounded accent-amber-400"
                      />
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                  ) : (
                    <>
                      <label htmlFor={field.key} className="block text-sm font-semibold text-gray-700">
                        {field.label} {field.required && <span className="text-amber-500">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.key}
                          required={field.required}
                          rows={3}
                          value={(custom[field.key] as string) ?? ''}
                          onChange={(e) => setCustom({ ...custom, [field.key]: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        />
                      ) : field.type === 'currency' ? (
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">R$</span>
                          <input
                            id={field.key}
                            inputMode="numeric"
                            required={field.required}
                            placeholder="0,00"
                            value={(custom[field.key] as string) ?? ''}
                            onChange={(e) => setCustom({ ...custom, [field.key]: formatBRLInput(e.target.value) })}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                          />
                        </div>
                      ) : (
                        <input
                          id={field.key}
                          type={field.type === 'number' ? 'number' : 'text'}
                          required={field.required}
                          value={(custom[field.key] as string) ?? ''}
                          onChange={(e) => setCustom({ ...custom, [field.key]: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        />
                      )}
                    </>
                  )}
                </div>
              ))}

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-sm font-bold text-white shadow-md shadow-amber-200 transition hover:bg-amber-500 disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  'Enviar'
                )}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by <span className="font-semibold text-amber-500">CRM NX</span>
        </p>
      </div>
    </div>
  );
}
