import { PremiumStudentCard } from '@/components/ui/PremiumStudentCard';
import { Student } from '@/types/student';

interface StudentsGridProps {
  students: Student[];
  isLoading: boolean;
  onView: (s: Student) => void;
  onTrack: (s: Student) => void;
}

export const StudentsGrid = ({ students, isLoading, onView, onTrack }: StudentsGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 motion-safe:animate-fade-in" data-animation-delay="0.7s" aria-busy="true" aria-live="polite">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card rounded-3xl p-6 animate-pulse" aria-hidden="true">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-muted/50 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 bg-muted/50 rounded mb-2"></div>
                <div className="h-4 bg-muted/30 rounded w-2/3"></div>
              </div>
            </div>
            <div className="h-2 bg-muted/30 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="h-12 bg-muted/30 rounded"></div>
              <div className="h-12 bg-muted/30 rounded"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-muted/30 rounded flex-1"></div>
              <div className="h-8 bg-muted/30 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" data-animation-delay="0.7s" role="list">
      {students.map((student, index) => (
        <PremiumStudentCard
          key={student.id}
          student={student}
          onView={onView}
          onTrack={onTrack}
          index={index}
        />
      ))}
    </div>
  );
};



