import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  UploadCloud, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ClipboardPaste,
  Trash2,
  Building2,
  Ticket,
  Calendar,
  User,
  Sparkles
} from 'lucide-react';
import { Task, Assignee } from '../types';
import { SpreadsheetService, SpreadsheetImportResult, ParsedSpreadsheetRow } from '../services/spreadsheetService';
import { formatToBRDate } from '../utils/dateUtils';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTasks: (tasks: Partial<Task>[]) => void;
  assignees: Assignee[];
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  onImportTasks,
  assignees,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [importResult, setImportResult] = useState<SpreadsheetImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await SpreadsheetService.parseFile(file, assignees);
      setImportResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar a planilha');
      setImportResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleProcessPasted = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Cole os dados da planilha antes de continuar.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = SpreadsheetService.parsePastedText(pastedText, assignees);
      setImportResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar os dados colados');
      setImportResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.validRows.length === 0) return;
    const tasksToCreate = importResult.validRows.map(r => r.parsedTask);
    onImportTasks(tasksToCreate);
    onClose();
  };

  const handleReset = () => {
    setImportResult(null);
    setPastedText('');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Importar Tarefas via Planilha
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Carregue arquivos .CSV, Excel (.XLSX) ou cole linhas para criar tarefas em lote
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => SpreadsheetService.downloadTemplate()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
              title="Baixar modelo de exemplo com cabeçalhos prontos"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Modelo (.CSV)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Upload File vs Paste) */}
        {!importResult && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Enviar Arquivo (.csv, .xlsx)</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'paste'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Colar Linhas de Planilha (Excel / CSV)</span>
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-rose-950">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {!importResult ? (
            <div>
              {activeTab === 'upload' ? (
                /* Drag and drop upload zone */
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mb-4 shadow-xs">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Arraste sua planilha aqui ou clique para selecionar
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                    Suporta arquivos <strong>.CSV</strong> e <strong>Excel (.XLSX)</strong>. As colunas como Título, Empresa, Chamado, Status e Prazos serão mapeadas automaticamente.
                  </p>
                  <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all">
                    Escolher Arquivo do Computador
                  </span>
                </div>
              ) : (
                /* Paste Text tab */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Copie as linhas da sua planilha (com cabeçalhos) e cole abaixo:
                    </label>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      rows={9}
                      placeholder={`Título\tEmpresa\tDescrição\tChamado\tStatus\tUrgência\tData de Entrega\nMigrar banco de dados\tSoma CSC\tConfigurar cluster\tCHAM-101\tA Fazer\tAlta\t2026-09-05\nRevisar tela de login\tAcme Corp\tAjustar validação\tCHAM-884\tEm Andamento\tMédia\t2026-09-02`}
                      className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleProcessPasted}
                      disabled={isProcessing || !pastedText.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analisar e Mapear Dados</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW OF PARSED DATA */
            <div className="space-y-4">
              
              {/* Summary Stats Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {importResult.fileName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total encontrado: {importResult.totalRows} linhas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {importResult.validRows.length} tarefas válidas
                  </span>

                  {importResult.invalidRows.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2.5 py-1 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      {importResult.invalidRows.length} linhas com erro
                    </span>
                  )}

                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg transition-colors"
                    title="Escolher outro arquivo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Título</th>
                        <th className="py-2.5 px-3">Empresa</th>
                        <th className="py-2.5 px-3">Chamado</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Urgência</th>
                        <th className="py-2.5 px-3">Responsáveis</th>
                        <th className="py-2.5 px-3">Prazo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {importResult.validRows.map((row) => {
                        const t = row.parsedTask;
                        return (
                          <tr key={row.rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{row.rowIndex}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                              {t.title}
                            </td>
                            <td className="py-2 px-3">
                              {t.company ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                  <Building2 className="w-3 h-3 text-blue-500" />
                                  {t.company}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px]">
                              {t.ticket ? (
                                <span className="text-amber-700 dark:text-amber-300 font-semibold">{t.ticket}</span>
                              ) : (
                                <span className="text-slate-400 italic">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.status === 'done' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : t.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {t.status === 'done' ? 'Concluído' : t.status === 'in_progress' ? 'Andamento' : 'A Fazer'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                t.urgency === 'urgent'
                                  ? 'text-rose-600 bg-rose-50 dark:bg-rose-950'
                                  : t.urgency === 'high'
                                  ? 'text-amber-600 bg-amber-50 dark:bg-amber-950'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}>
                                {t.urgency}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                              {t.assignees && t.assignees.length > 0 
                                ? t.assignees.map(a => a.name.split(' ')[0]).join(', ') 
                                : <span className="text-slate-400 italic">Geral</span>}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                              {t.dueDate ? formatToBRDate(t.dueDate) : <span className="text-slate-400 italic">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>

          {importResult && (
            <button
              onClick={handleConfirmImport}
              disabled={importResult.validRows.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Importação de {importResult.validRows.length} Tarefas</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
