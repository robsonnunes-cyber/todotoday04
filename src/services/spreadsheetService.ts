/**
 * Spreadsheet Import Service
 * Handles CSV and Excel (.xlsx, .xls) parsing, column mapping and validation
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Task, TaskStatus, TaskUrgency, Assignee } from '../types';
import { normalizeToISODate, formatToBRDate } from '../utils/dateUtils';

export interface ParsedSpreadsheetRow {
  rowIndex: number;
  raw: Record<string, any>;
  parsedTask: Partial<Task>;
  isValid: boolean;
  errors: string[];
}

export interface SpreadsheetImportResult {
  fileName: string;
  totalRows: number;
  validRows: ParsedSpreadsheetRow[];
  invalidRows: ParsedSpreadsheetRow[];
  headers: string[];
}

export class SpreadsheetService {
  /**
   * Parse CSV or Excel File
   */
  public static async parseFile(
    file: File, 
    availableAssignees: Assignee[]
  ): Promise<SpreadsheetImportResult> {
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    let rawData: Record<string, any>[] = [];
    let headers: string[] = [];

    if (extension === 'csv' || extension === 'txt') {
      const text = await file.text();
      const parseResult = Papa.parse<Record<string, any>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
      });
      rawData = parseResult.data;
      headers = parseResult.meta.fields || [];
    } else if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
      if (rawData.length > 0) {
        headers = Object.keys(rawData[0]);
      }
    } else {
      throw new Error('Formato de arquivo não suportado. Por favor utilize arquivos .csv ou .xlsx');
    }

    return this.processRawRows(rawData, headers, fileName, availableAssignees);
  }

  /**
   * Parse Raw Text / Copy-Pasted CSV or TSV (e.g. from Excel / Sheets)
   */
  public static parsePastedText(
    text: string, 
    availableAssignees: Assignee[]
  ): SpreadsheetImportResult {
    const parseResult = Papa.parse<Record<string, any>>(text.trim(), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });

    const rawData = parseResult.data;
    const headers = parseResult.meta.fields || [];

    return this.processRawRows(rawData, headers, 'Colado da Área de Transferência', availableAssignees);
  }

  /**
   * Process raw rows and map columns intelligently
   */
  private static processRawRows(
    rows: Record<string, any>[],
    headers: string[],
    fileName: string,
    availableAssignees: Assignee[]
  ): SpreadsheetImportResult {
    const validRows: ParsedSpreadsheetRow[] = [];
    const invalidRows: ParsedSpreadsheetRow[] = [];

    rows.forEach((row, index) => {
      const errors: string[] = [];
      const rowIndex = index + 2; // +2 considering 1-based index and header row

      // Find best match for each task field
      const title = this.getFieldValue(row, ['título', 'titulo', 'title', 'tarefa', 'nome', 'atividade', 'assunto', 'task']);
      const company = this.getFieldValue(row, ['empresa', 'company', 'cliente', 'organização', 'organizacao', 'organização']);
      const description = this.getFieldValue(row, ['descrição', 'descricao', 'description', 'detalhes', 'observação', 'observacao', 'notas', 'obs']);
      const ticket = this.getFieldValue(row, ['chamado', 'ticket', 'protocolo', 'nº chamado', 'no chamado', 'id chamado', 'incidente']);
      const rawStatus = this.getFieldValue(row, ['status', 'estado', 'fase', 'situação', 'situacao']);
      const rawUrgency = this.getFieldValue(row, ['urgência', 'urgencia', 'prioridade', 'urgency', 'priority']);
      const rawAssignee = this.getFieldValue(row, ['responsável', 'responsavel', 'responsáveis', 'responsaveis', 'assignee', 'assignees', 'atribuído']);
      const rawDueDate = this.getFieldValue(row, ['data de entrega', 'prazo', 'vencimento', 'due date', 'duedate', 'data limite', 'data']);
      const rawTags = this.getFieldValue(row, ['tags', 'etiquetas', 'categorias', 'marcador', 'marcadores']);

      if (!title || title.trim().length === 0) {
        errors.push('Título da tarefa é obrigatório');
      }

      // Map status
      let status: TaskStatus = 'todo';
      if (rawStatus) {
        const s = rawStatus.toLowerCase().trim();
        if (s.includes('conclu') || s.includes('done') || s.includes('finaliz') || s.includes('pronto')) {
          status = 'done';
        } else if (s.includes('andamento') || s.includes('progresso') || s.includes('doing') || s.includes('in_progress') || s.includes('execu')) {
          status = 'in_progress';
        }
      }

      // Map urgency
      let urgency: TaskUrgency = 'medium';
      if (rawUrgency) {
        const u = rawUrgency.toLowerCase().trim();
        if (u.includes('urgent') || u.includes('crític') || u.includes('critic')) {
          urgency = 'urgent';
        } else if (u.includes('alt') || u.includes('high')) {
          urgency = 'high';
        } else if (u.includes('baix') || u.includes('low')) {
          urgency = 'low';
        }
      }

      // Map assignees
      const assignees: Assignee[] = [];
      if (rawAssignee) {
        const names = rawAssignee.split(/[,;/+&]/).map((n: string) => n.trim().toLowerCase());
        names.forEach((nameCandidate: string) => {
          if (!nameCandidate) return;
          const found = availableAssignees.find(
            a => a.name.toLowerCase().includes(nameCandidate) || 
                 a.email?.toLowerCase().includes(nameCandidate) ||
                 a.id.toLowerCase() === nameCandidate
          );
          if (found) {
            if (!assignees.some(a => a.id === found.id)) {
              assignees.push(found);
            }
          }
        });
      }

      // Format Due Date
      let dueDate = '';
      if (rawDueDate) {
        dueDate = this.normalizeDate(rawDueDate);
      }

      // Map Tags
      const tags: string[] = [];
      if (rawTags) {
        const splitTags = String(rawTags).split(/[,;#/|]/).map(t => t.trim().replace(/^#/, ''));
        splitTags.forEach(t => {
          if (t && !tags.includes(t)) {
            tags.push(t);
          }
        });
      }

      const parsedTask: Partial<Task> = {
        id: 'TASK-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: title ? title.trim() : '',
        company: company ? company.trim() : '',
        description: description ? description.trim() : '',
        ticket: ticket ? ticket.trim() : '',
        status,
        urgency,
        assignees,
        dueDate,
        tags,
        attachments: [],
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: 0,
      };

      const rowResult: ParsedSpreadsheetRow = {
        rowIndex,
        raw: row,
        parsedTask,
        isValid: errors.length === 0,
        errors,
      };

      if (rowResult.isValid) {
        validRows.push(rowResult);
      } else {
        invalidRows.push(rowResult);
      }
    });

    return {
      fileName,
      totalRows: rows.length,
      validRows,
      invalidRows,
      headers,
    };
  }

  /**
   * Helper to normalize date strings to YYYY-MM-DD
   */
  private static normalizeDate(dateVal: any): string {
    return normalizeToISODate(dateVal);
  }

  /**
   * Case-insensitive flexible field lookup
   */
  private static getFieldValue(row: Record<string, any>, possibleKeys: string[]): string {
    for (const key of Object.keys(row)) {
      const cleanKey = key.toLowerCase().trim();
      if (possibleKeys.some(pk => cleanKey === pk || cleanKey.includes(pk))) {
        const val = row[key];
        return val !== undefined && val !== null ? String(val) : '';
      }
    }
    return '';
  }

  /**
   * Generate downloadable sample CSV template
   */
  public static generateSampleCSV(): string {
    const headers = [
      'Título',
      'Empresa',
      'Descrição',
      'Chamado',
      'Status',
      'Urgência',
      'Responsável',
      'Data de Entrega',
      'Tags'
    ];

    const sampleRows = [
      [
        'Configurar integração com banco de dados',
        'Soma CSC',
        'Revisar credenciais de acesso e configurar pool de conexões',
        'CHAM-1042',
        'A Fazer',
        'Alta',
        'Robson',
        formatToBRDate(new Date(Date.now() + 86400000 * 2)),
        'infra, backend'
      ],
      [
        'Ajustar layout responsivo do painel',
        'Acme Corp',
        'Verificar visualização em dispositivos móveis e tablets',
        'CHAM-8842',
        'Em Andamento',
        'Média',
        'Mariana',
        formatToBRDate(new Date(Date.now() + 86400000 * 4)),
        'frontend, design'
      ],
      [
        'Auditoria de segurança e logs de acesso',
        'Global Logística',
        'Exportar relatórios de conformidade e acessos de usuários',
        'SEC-9912',
        'A Fazer',
        'Urgente',
        'Carlos',
        formatToBRDate(new Date(Date.now() + 86400000)),
        'segurança, auditoria'
      ]
    ];

    return Papa.unparse({
      fields: headers,
      data: sampleRows,
    });
  }

  /**
   * Trigger download of sample template
   */
  public static downloadTemplate() {
    const csvContent = this.generateSampleCSV();
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_tarefas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
