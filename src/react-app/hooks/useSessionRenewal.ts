import { useEffect, useRef } from 'react';
import { useAuth } from '@getmocha/users-service/react';

/**
 * Hook para renovar a sessão automaticamente enquanto o usuário está ativo.
 * Detecta atividade do usuário (movimento do mouse, cliques, teclas) e renova
 * a sessão a cada 3 minutos se houver atividade.
 */
export function useSessionRenewal() {
  const { user, fetchUser } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const renewalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRenewingRef = useRef<boolean>(false);
  const fetchUserRef = useRef(fetchUser);
  
  // Manter fetchUser atualizado sem causar re-renders
  useEffect(() => {
    fetchUserRef.current = fetchUser;
  }, [fetchUser]);

  // Verificar se o usuário está autenticado (apenas uma vez, baseado no ID)
  const userId = user?.id;

  useEffect(() => {
    // Não fazer nada se o usuário não estiver autenticado
    if (!userId) return;

    // Função para atualizar o timestamp de última atividade
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Eventos que indicam atividade do usuário
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Adicionar listeners para detectar atividade
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Função para renovar a sessão
    const renewSession = async () => {
      // Evitar chamadas simultâneas
      if (isRenewingRef.current) return;
      
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutos em ms
      
      // Só renovar se houver atividade recente (nos últimos 5 minutos)
      if (timeSinceLastActivity < fiveMinutes) {
        try {
          isRenewingRef.current = true;
          // fetchUser faz uma requisição ao /api/users/me
          // que automaticamente renova o cookie de sessão no backend
          await fetchUserRef.current();
          console.log('🔄 Sessão renovada automaticamente');
        } catch (error) {
          console.error('❌ Erro ao renovar sessão:', error);
        } finally {
          isRenewingRef.current = false;
        }
      }
    };

    // Renovar a sessão a cada 3 minutos para ter margem de segurança
    renewalTimerRef.current = setInterval(renewSession, 3 * 60 * 1000);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      
      if (renewalTimerRef.current) {
        clearInterval(renewalTimerRef.current);
      }
    };
  }, [userId]);
}
