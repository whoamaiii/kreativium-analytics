import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Student } from "@/types/student";
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trash2, Eye, TrendingUp, School } from 'lucide-react';
import { isToday } from 'date-fns';
import { useTranslation } from "@/hooks/useTranslation";
import { Progress } from "@/components/ui/progress";
import { dataStorage } from '@/lib/dataStorage';
import { analyticsCoordinator } from '@/lib/analyticsCoordinator';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

interface PremiumStudentCardProps {
  student: Student;
  onView: (student: Student) => void;
  onTrack: (student: Student) => void;
  onDelete?: (student: Student) => void;
  index: number;
}

export const PremiumStudentCard = ({ 
  student, 
  onView, 
  onTrack, 
  onDelete,
  index 
}: PremiumStudentCardProps) => {
  const { tDashboard, tCommon, tStudent, formatDate } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const handleDeleteStudent = async () => {
    try {
      dataStorage.deleteStudent(student.id);
      toast.success(tStudent('profile.deleteSuccess', { name: student.name }));
      
      // Broadcast cache clear to refresh dashboard and analytics views
      try { analyticsCoordinator.broadcastCacheClear(); } catch { /* noop */ }
      
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(student);
      }
    } catch (error) {
      toast.error(tStudent('profile.deleteFailure'), {
        description: error instanceof Error ? error.message : tStudent('profile.deleteFailureUnknown')
      });
    }
  };

  // Generate consistent mock data based on student ID to prevent changes on re-render
  const mockData = useMemo(() => {
    // Use student ID as seed for consistent values
    const seed = student.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    // Seeded random function
    const seededRandom = (n: number) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };
    
    return {
      progressPercentage: Math.floor(seededRandom(1) * 100),
      isActiveToday: seededRandom(2) > 0.5,
      entriesThisWeek: Math.floor(seededRandom(3) * 10),
      lastTracked: new Date(Date.now() - seededRandom(4) * 7 * 24 * 60 * 60 * 1000)
    };
  }, [student.id]);
  
  const { progressPercentage, isActiveToday, entriesThisWeek, lastTracked } = mockData;
  const lastTrackedText = isToday(lastTracked) 
    ? String(tCommon('time.today')) 
    : formatDate(lastTracked);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.08,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-500"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background gradient animation */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          initial={false}
        />
        
        {/* Active indicator */}
        {isActiveToday && (
          <motion.div
            className="absolute top-4 right-4 w-3 h-3 bg-positive rounded-full"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity
            }}
          />
        )}
        
        <CardContent className="relative z-10 p-6">
          {/* Header with Avatar and Basic Info */}
          <div className="flex items-start gap-4 mb-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <motion.div
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                whileHover={{ scale: 1.2 }}
              >
                <User className="text-white h-3 w-3" />
              </motion.div>
            </motion.div>
            
            <div className="flex-1">
              <motion.h3 
                className="font-semibold text-lg text-foreground mb-1"
                layoutId={`student-name-${student.id}`}
              >
                {student.name}
              </motion.h3>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <School className="h-4 w-4" />
                <span>
                  {student.grade 
                    ? String(tDashboard('studentCard.grade', { grade: student.grade }))
                    : String(tDashboard('studentCard.noGrade'))
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{String(tDashboard('studentCard.dataCollection'))}</span>
              <span className="text-xs font-medium text-primary">{progressPercentage}%</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2 bg-muted/50"
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <div className="text-lg font-bold text-primary">{entriesThisWeek}</div>
              <div className="text-xs text-muted-foreground">{String(tDashboard('studentCard.thisWeek'))}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-foreground">{lastTrackedText}</div>
              <div className="text-xs text-muted-foreground">{String(tDashboard('studentCard.lastTrackedLabel'))}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-20 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView(student);
              }}
              className="flex-1 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200"
            >
              <Eye className="h-4 w-4 mr-1" />
              {String(tDashboard('studentCard.viewProfile'))}
            </Button>
            
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTrack(student);
              }}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-200"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              {String(tDashboard('studentCard.trackNow'))}
            </Button>
            
            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{String(tStudent('profile.deleteConfirmTitle'))}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {String(tStudent('profile.deleteConfirmDescription', { name: student.name }))}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{String(tCommon('buttons.cancel'))}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteStudent}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {String(tCommon('buttons.delete'))}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>

        {/* Subtle shine effect */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 pointer-events-none"
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ 
                x: "100%", 
                opacity: 1,
                transition: {
                  duration: 0.6,
                  ease: "easeInOut"
                }
              }}
              exit={{ 
                opacity: 0,
                transition: { duration: 0.2 }
              }}
            />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};