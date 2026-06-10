'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { PublicForm } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [custom, setCustom] = useState<Record<string, string | boolean | string[]>>({});

  useEffect(() => {
    let active = true;
    apiGet<{ form: PublicForm }>(`/public/forms/${publicId}`)
      .then((r) => active && setForm(r.form))
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
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
        fields[field.key] = field.type === 'number' ? Number(value) : value;
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
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (notFound || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">
        Formulário indisponível ou desativado.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold text-foreground">CommercialPipe</span>
        </div>
        <Card className="shadow-xl">
          {done ? (
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-[hsl(var(--success))]" />
              <h2 className="text-xl font-semibold">Recebemos seu contato!</h2>
              <p className="text-sm text-muted-foreground">Em breve nosso time entrará em contato.</p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>{form.name}</CardTitle>
                {form.description && <CardDescription>{form.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input id="name" required value={base.name} onChange={(e) => setBase({ ...base, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Nome da empresa *</Label>
                    <Input id="company" required value={base.company} onChange={(e) => setBase({ ...base, company: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" required value={base.phone} onChange={(e) => setBase({ ...base, phone: e.target.value })} placeholder="(11) 99999-9999" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" value={base.email} onChange={(e) => setBase({ ...base, email: e.target.value })} />
                    </div>
                  </div>

                  {form.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      {field.type === 'checkbox' && field.options && field.options.length > 0 ? (
                        <>
                          <Label>
                            {field.label} {field.required && '*'}
                          </Label>
                          <div className="space-y-1.5">
                            {field.options.map((opt) => {
                              const arr = (custom[field.key] as string[] | undefined) ?? [];
                              const checked = arr.includes(opt);
                              return (
                                <label key={opt} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      setCustom({
                                        ...custom,
                                        [field.key]: e.target.checked
                                          ? [...arr, opt]
                                          : arr.filter((o) => o !== opt),
                                      })
                                    }
                                  />
                                  {opt}
                                </label>
                              );
                            })}
                          </div>
                        </>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(custom[field.key])}
                            onChange={(e) => setCustom({ ...custom, [field.key]: e.target.checked })}
                          />
                          {field.label} {field.required && '*'}
                        </label>
                      ) : (
                        <>
                          <Label htmlFor={field.key}>
                            {field.label} {field.required && '*'}
                          </Label>
                          {field.type === 'textarea' ? (
                            <Textarea
                              id={field.key}
                              required={field.required}
                              value={(custom[field.key] as string) ?? ''}
                              onChange={(e) => setCustom({ ...custom, [field.key]: e.target.value })}
                            />
                          ) : (
                            <Input
                              id={field.key}
                              type={field.type === 'number' ? 'number' : 'text'}
                              required={field.required}
                              value={(custom[field.key] as string) ?? ''}
                              onChange={(e) => setCustom({ ...custom, [field.key]: e.target.value })}
                            />
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Enviando...' : 'Enviar'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
