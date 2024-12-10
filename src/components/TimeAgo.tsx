import { useState, useEffect } from 'react';
interface TimeAgoProps {
    timestamp: number | undefined;
  }
  const TimeAgo: React.FC<TimeAgoProps> = ({ timestamp }) => {
    const [timeAgo, setTimeAgo] = useState('');
  
    useEffect(() => {
      function updateTimeAgo() {
        if (!timestamp) {
          setTimeAgo('');
          return;
        }
  
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) {
          setTimeAgo('just now');
        } else if (seconds < 3600) {
          const minutes = Math.floor(seconds / 60);
          setTimeAgo(`${minutes}m ago`);
        } else if (seconds < 86400) {
          const hours = Math.floor(seconds / 3600);
          setTimeAgo(`${hours}h ago`);
        } else {
          const days = Math.floor(seconds / 86400);
          setTimeAgo(`${days}d ago`);
        }
      }
  
      updateTimeAgo();
      const interval = setInterval(updateTimeAgo, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }, [timestamp]);
  
    return (
      <span className="text-[#9b9a97] text-[15px] relative pr-2">{timeAgo ? `Edited ${timeAgo}` : ''}</span>
    );
  };

  export default TimeAgo;