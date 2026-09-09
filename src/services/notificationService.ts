import { Task } from '../types';

/**
 * Play a subtle pleasant notification chime using Web Audio API
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Pleasant two-tone chime (F5 -> A5)
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now); // F5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('AudioContext not available or blocked', e);
  }
}

/**
 * Request notification permission from the browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações de desktop.');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificação:', error);
    return 'denied';
  }
}

/**
 * Trigger a browser notification
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: '/vite.svg',
      badge: '/vite.svg',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.error('Erro ao emitir notificação:', err);
  }
}

/**
 * Check for tasks due today or overdue and alert
 */
export function checkAndNotifyUrgentTasks(tasks: Task[]) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  
  const dueTodayTasks = pendingTasks.filter(t => t.dueDate === todayStr);
  const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < todayStr);
  const urgentTasks = pendingTasks.filter(t => t.urgency === 'urgent');

  if (dueTodayTasks.length > 0 || overdueTasks.length > 0 || urgentTasks.length > 0) {
    playNotificationSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      let bodyText = '';
      if (dueTodayTasks.length > 0) {
        bodyText += `📅 ${dueTodayTasks.length} tarefa(s) vencem HOJE.\n`;
      }
      if (overdueTasks.length > 0) {
        bodyText += `⚠️ ${overdueTasks.length} tarefa(s) estão ATRASADAS.\n`;
      }
      if (urgentTasks.length > 0) {
        bodyText += `🚨 ${urgentTasks.length} tarefa(s) com prioridade URGENTE pendentes.`;
      }

      sendBrowserNotification('Planner Kanban Pro - Lembrete de Prazos', {
        body: bodyText.trim(),
        tag: 'planner-daily-reminder',
      });
    }
  }
}
