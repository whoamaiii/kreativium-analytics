import { useEffect, useState } from 'react';

const getInitialStatus = (): boolean => {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
};

export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(getInitialStatus);

  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(getInitialStatus());
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return isOnline;
};



