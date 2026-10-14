import { useEffect } from 'react';
import { installAuthBroadcast, restoreSession } from './session';
export function AuthBootstrap() {
  useEffect(() => {
    installAuthBroadcast();
    void restoreSession();
  }, []);
  return null;
}
