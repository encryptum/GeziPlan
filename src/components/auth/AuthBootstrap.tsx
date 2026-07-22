import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AuthBootstrap() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return null;
}
