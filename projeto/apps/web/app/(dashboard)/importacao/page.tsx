'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ChevronRight, FileUp, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Step = 'upload' | 'mapping' | 'preview' | 'done';

const LEAD_FIELDS = [
  { key: 'name', label: 'Nome do contato', required: true },
  { key: 'company', label: 'Empresa', required: true },
  { key: 'phone', label: 'Telefone', required: true },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'revenue', label: 'Faturamento (R$)', required: false },
  { key: 'description', label: 'Descrição / Observação', required: false },
];

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = lines[0]?.includes(';') ? ';' : ',';
  const headers = (lines[0] ?? '').split(sep).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

export default function ImportacaoPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Selecione um arquivo CSV');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) { toast.error('Arquivo CSV inválido ou vazio'); return; }
      setCsvData(parsed);
      const auto: Record<string, string> = {};
      LEAD_FIELDS.forEach((f) => {
        const match = parsed.headers.find(
          (h) => h.toLowerCase().replace(/\s/g, '_') === f.key || h.toLowerCase().includes(f.key.split('_')[0] ?? ''),
        );
        if (match) auto[f.key] = match;
      });
      setMapping(auto);
      setStep('mapping');
    };
    reader.readAsText(file, 'utf-8');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const previewRows = csvData?.rows.slice(0, 5) ?? [];
  const mappedRows = previewRows.map((row) => {
    const out: Record<string, string> = {};
    Object.entries(mapping).forEach(([field, col]) => { if (col) out[field] = row[col] ?? ''; });
    return out;
  });
  const requiredMapped = LEAD_FIELDS.filter((f) => f.required).every((f) => mapping[f.key]);

  async function doImport() {
    if (!csvData) return;
    setImporting(true);
    try {
      const leads = csvData.rows.map((row) => {
        const out: Record<string, string> = {};
        Object.entries(mapping).forEach(([field, col]) => { if (col) out[field] = row[col] ?? ''; });
        return out;
      }).filter((r) => r.name && r.company && r.phone);

      const res = await apiPost<{ imported: number; errors: number }>('/leads/import', { leads });
      setResult(res);
      setStep('done');
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha na importação');
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep('upload');
    setCsvData(null);
    setMapping({});
    setResult(null);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Importação Inteligente</h1>
        <p className="text-sm text-muted-foreground">
          Importe leads via planilha CSV com mapeamento automático de colunas.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        {(['upload', 'mapping', 'preview', 'done'] as Step[]).map((s, i, arr) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step === s ? 'bg-brand text-white' : arr.indexOf(step) > i ? 'bg-brand/30 text-brand' : 'bg-muted text-muted-foreground'
            }`}>{i + 1}</span>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'upload' ? 'Arquivo' : s === 'mapping' ? 'Mapeamento' : s === 'preview' ? 'Pré-visualização' : 'Concluído'}
            </span>
            {i < arr.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </span>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed border-brand/30 p-12 text-center transition-colors hover:border-brand/60 hover:bg-brand/[0.02]"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15">
            <FileUp className="h-7 w-7 text-brand" />
          </div>
          <div>
            <p className="font-semibold">Arraste o arquivo CSV aqui ou clique para selecionar</p>
            <p className="mt-1 text-sm text-muted-foreground">Suporta arquivos .csv com separador vírgula (,) ou ponto-e-vírgula (;)</p>
          </div>
          <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <Button variant="outline">
            <Upload className="h-4 w-4" /> Selecionar arquivo
          </Button>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 'mapping' && csvData && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm text-muted-foreground">
              <strong>{csvData.rows.length}</strong> linhas detectadas. Mapeie as colunas do CSV para os campos do sistema.
            </p>
            <div className="space-y-3">
              {LEAD_FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{f.label}</span>
                    {f.required && <Badge variant="destructive" className="text-[9px]">obrigatório</Badge>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Select value={mapping[f.key] ?? '__none__'} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Não mapeado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Não mapeado —</SelectItem>
                      {csvData.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={() => setStep('preview')} disabled={!requiredMapped}>
                Pré-visualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && csvData && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm">
              Pré-visualização das <strong>primeiras 5 linhas</strong>. Total: <strong>{csvData.rows.length}</strong> leads.
            </p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    {LEAD_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                      <th key={f.key} className="px-3 py-2 font-medium">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mappedRows.map((row, i) => (
                    <tr key={i}>
                      {LEAD_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <td key={f.key} className="px-3 py-2">{row[f.key] || <span className="text-muted-foreground/50">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-muted-foreground">
                  Linhas sem nome, empresa ou telefone serão ignoradas automaticamente.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
                <Button onClick={doImport} disabled={importing}>
                  {importing ? 'Importando...' : `Importar ${csvData.rows.length} leads`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === 'done' && result && (
        <Card className="border-brand/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-brand" />
            <div>
              <p className="text-2xl font-bold">{result.imported} leads importados</p>
              {result.errors > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">{result.errors} linhas ignoradas (dados incompletos)</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                <Upload className="h-4 w-4" /> Nova importação
              </Button>
              <Button onClick={() => window.location.assign('/pipeline')}>
                Ver pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
