/**
 * Google Chat Integration Service
 * Handles Spaces, Threads, Messages retrieval and intelligent task extraction
 */

import { TaskUrgency } from '../types';

export interface ChatSpace {
  id: string;
  name: string;
  displayName: string;
  type: 'ROOM' | 'DM' | 'GROUP_CHAT';
  unreadCount?: number;
  companyHint?: string;
}

export interface ChatMessage {
  id: string;
  spaceId: string;
  spaceName: string;
  senderName: string;
  senderEmail: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  extractedTicket?: string;
  extractedCompany?: string;
  suggestedUrgency?: TaskUrgency;
  isRead?: boolean;
}

const CHAT_TOKEN_KEY = 'planner_pro_chat_token';

// Realistic sample spaces & messages from company channels & DMs
export const DEMO_CHAT_SPACES: ChatSpace[] = [
  {
    id: 'space-soma-suporte',
    name: 'spaces/AAAASomaSuporte',
    displayName: '🚨 Suporte & Operações - Soma CSC',
    type: 'ROOM',
    unreadCount: 3,
    companyHint: 'Soma CSC',
  },
  {
    id: 'space-acme-corp',
    name: 'spaces/AAAAAcmeProjects',
    displayName: '💼 Atendimento Acme Corp',
    type: 'ROOM',
    unreadCount: 2,
    companyHint: 'Acme Corp',
  },
  {
    id: 'space-infra-cloud',
    name: 'spaces/AAAAInfraNexus',
    displayName: '⚙️ Incidentes & Infra - Nexus Tech',
    type: 'ROOM',
    unreadCount: 1,
    companyHint: 'Nexus Tech',
  },
  {
    id: 'space-logistica',
    name: 'spaces/AAAAGlobalLog',
    displayName: '🚛 Entregas & Integrações - Global Logística',
    type: 'ROOM',
    unreadCount: 0,
    companyHint: 'Global Logística',
  },
  {
    id: 'dm-carlos',
    name: 'spaces/DMCarlosMendes',
    displayName: 'Carlos Mendes (Mensagem Direta)',
    type: 'DM',
    unreadCount: 1,
    companyHint: 'Soma CSC',
  },
];

export const DEMO_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'chat-msg-1',
    spaceId: 'space-soma-suporte',
    spaceName: '🚨 Suporte & Operações - Soma CSC',
    senderName: 'Carlos Mendes',
    senderEmail: 'carlos.mendes@somacsc.com',
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    text: 'Pessoal, abri o chamado CHAM-5120 referente a lentidão no fechamento contábil mensal da Soma CSC. O job da folha precisa rodar até as 18h com urgência!',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    extractedTicket: 'CHAM-5120',
    extractedCompany: 'Soma CSC',
    suggestedUrgency: 'urgent',
    isRead: false,
  },
  {
    id: 'chat-msg-2',
    spaceId: 'space-soma-suporte',
    spaceName: '🚨 Suporte & Operações - Soma CSC',
    senderName: 'Mariana Alves',
    senderEmail: 'mariana.alves@somacsc.com',
    senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    text: 'Atualização do chamado #9931: Os testes unitários da API de integração foram concluídos com sucesso. Robson, precisamos aprovar o deploy para homologação.',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    extractedTicket: '#9931',
    extractedCompany: 'Soma CSC',
    suggestedUrgency: 'high',
    isRead: false,
  },
  {
    id: 'chat-msg-3',
    spaceId: 'space-acme-corp',
    spaceName: '💼 Atendimento Acme Corp',
    senderName: 'Juliana Rocha',
    senderEmail: 'j.rocha@acmecorp.com',
    senderAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    text: 'Boa tarde equipe! Cliente da Acme Corp solicitou a inclusão do novo campo de CNPJ no relatório financeiro de exportação. Ticket REQ-7721.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    extractedTicket: 'REQ-7721',
    extractedCompany: 'Acme Corp',
    suggestedUrgency: 'medium',
    isRead: true,
  },
  {
    id: 'chat-msg-4',
    spaceId: 'space-infra-cloud',
    spaceName: '⚙️ Incidentes & Infra - Nexus Tech',
    senderName: 'Bot de Monitoramento',
    senderEmail: 'bot-infra@nexus-tech.io',
    senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    text: 'ALERTA INC-3341: O consumo de CPU do banco PostgreSQL da Nexus Tech atingiu 94% por 10 minutos seguidos.',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    extractedTicket: 'INC-3341',
    extractedCompany: 'Nexus Tech',
    suggestedUrgency: 'urgent',
    isRead: true,
  },
  {
    id: 'chat-msg-5',
    spaceId: 'space-logistica',
    spaceName: '🚛 Entregas & Integrações - Global Logística',
    senderName: 'Roberto Silva',
    senderEmail: 'roberto@global-log.com.br',
    senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    text: 'Chamado CHAM-8088: Configuração da chave de webhook da transportadora concluída. Falta validar retorno de tracking.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    extractedTicket: 'CHAM-8088',
    extractedCompany: 'Global Logística',
    suggestedUrgency: 'low',
    isRead: true,
  },
  {
    id: 'chat-msg-6',
    spaceId: 'dm-carlos',
    spaceName: 'Carlos Mendes (Mensagem Direta)',
    senderName: 'Carlos Mendes',
    senderEmail: 'carlos.mendes@somacsc.com',
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    text: 'Robson, quando puder dá uma olhada na documentação da arquitetura que subi no Drive. Quero alinhar na reunião de amanhã cedo.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    extractedTicket: '',
    extractedCompany: 'Soma CSC',
    suggestedUrgency: 'medium',
    isRead: false,
  }
];

export class ChatService {
  /**
   * Helper to extract tickets/chamados
   */
  public static extractTicket(text: string): string {
    if (!text) return '';
    const patterns = [
      /(?:CHAM|CHAMADO|TICKET|INC|REQ|TASK|OS|CARD|ISSUE)[-#:\s]*([A-Z0-9_-]+)/i,
      /#([0-9]{3,8})/i,
      /Protocolo[:\s]*([0-9A-Z_-]+)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return '';
  }

  /**
   * Helper to extract company
   */
  public static extractCompany(text: string, spaceName: string, senderEmail: string): string {
    const combined = `${text} ${spaceName} ${senderEmail}`.toLowerCase();
    if (combined.includes('soma') || combined.includes('somacsc')) return 'Soma CSC';
    if (combined.includes('acme')) return 'Acme Corp';
    if (combined.includes('global') || combined.includes('log')) return 'Global Logística';
    if (combined.includes('nexus')) return 'Nexus Tech';
    return '';
  }

  /**
   * Helper to infer urgency
   */
  public static inferUrgency(text: string): TaskUrgency {
    const lower = text.toLowerCase();
    if (lower.includes('urgent') || lower.includes('crític') || lower.includes('critic') || lower.includes('fora do ar') || lower.includes('alerta inc') || lower.includes('asap')) {
      return 'urgent';
    }
    if (lower.includes('alt') || lower.includes('importante') || lower.includes('prazo') || lower.includes('homologação')) {
      return 'high';
    }
    if (lower.includes('baix') || lower.includes('quando puder') || lower.includes('sugestão')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Fetch chat spaces
   */
  public static async fetchSpaces(token?: string): Promise<ChatSpace[]> {
    if (!token) {
      return DEMO_CHAT_SPACES;
    }

    try {
      const response = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return DEMO_CHAT_SPACES;
      }

      const data = await response.json();
      if (!data.spaces || data.spaces.length === 0) {
        return DEMO_CHAT_SPACES;
      }

      return data.spaces.map((s: any) => ({
        id: s.name,
        name: s.name,
        displayName: s.displayName || (s.type === 'DM' ? 'Mensagem Direta' : 'Espaço Google Chat'),
        type: s.type || 'ROOM',
        unreadCount: 0,
      }));
    } catch (e) {
      console.warn('Could not load live Google Chat spaces, using workspaces preview', e);
      return DEMO_CHAT_SPACES;
    }
  }

  /**
   * Fetch messages for a given space
   */
  public static async fetchMessagesForSpace(spaceId: string, token?: string): Promise<ChatMessage[]> {
    if (!token || spaceId.startsWith('space-') || spaceId.startsWith('dm-')) {
      if (spaceId === 'all') {
        return DEMO_CHAT_MESSAGES;
      }
      return DEMO_CHAT_MESSAGES.filter(m => m.spaceId === spaceId);
    }

    try {
      const response = await fetch(`https://chat.googleapis.com/v1/${spaceId}/messages?pageSize=25`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return DEMO_CHAT_MESSAGES;
      }

      const data = await response.json();
      if (!data.messages || data.messages.length === 0) {
        return [];
      }

      return data.messages.map((m: any) => {
        const text = m.text || '';
        const ticket = this.extractTicket(text);
        const company = this.extractCompany(text, '', m.sender?.name || '');
        const urgency = this.inferUrgency(text);

        return {
          id: m.name || `msg-${Date.now()}`,
          spaceId,
          spaceName: 'Google Chat Space',
          senderName: m.sender?.displayName || m.sender?.name || 'Colega de Equipe',
          senderEmail: m.sender?.email || '',
          senderAvatar: m.sender?.avatarUrl,
          text,
          timestamp: m.createTime || new Date().toISOString(),
          extractedTicket: ticket,
          extractedCompany: company,
          suggestedUrgency: urgency,
          isRead: true,
        };
      });
    } catch (e) {
      console.warn('Using demo chat messages', e);
      return DEMO_CHAT_MESSAGES;
    }
  }
}
