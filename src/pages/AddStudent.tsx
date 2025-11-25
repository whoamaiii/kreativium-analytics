import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSettings } from '@/components/LanguageSettings';
import { analyticsManager } from '@/lib/analyticsManager';
import { logger } from '@/lib/logger';
import { validateStudent, sanitizeInput } from '@/lib/formValidation';
import { useStudentActions } from '@/hooks/useMutationActions';

const AddStudent = () => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { tStudent, tCommon } = useTranslation();
  const { upsertStudent } = useStudentActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod schema
    const validationResult = validateStudent({
      name: name.trim(),
      grade: grade.trim(),
      dateOfBirth: dateOfBirth.trim(),
      notes: notes.trim(),
    });

    if (!validationResult.success) {
      // Convert validation errors to field-level error map
      const errorMap: Record<string, string> = {};
      validationResult.errors.forEach((err) => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      toast.error('Please fix the validation errors');
      return;
    }

    setErrors({}); // Clear any previous errors
    setIsLoading(true);

    try {
      const sanitizedName = sanitizeInput(name);
      const sanitizedGrade = grade ? sanitizeInput(grade) : undefined;
      const sanitizedNotes = notes ? sanitizeInput(notes) : undefined;

      const newStudent = upsertStudent({
        name: sanitizedName,
        gradeLevel: sanitizedGrade,
        dateOfBirth: dateOfBirth || undefined,
        notes: sanitizedNotes,
      });

      // Initialize analytics infrastructure only (no mock data generation)
      analyticsManager.initializeStudentAnalytics(newStudent.id);

      toast.success(String(tStudent('addStudent.success')));
      navigate('/');
    } catch (error) {
      logger.error('Error adding student:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to add student. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              aria-label={String(tStudent('addStudent.backToDashboard'))}
              title={String(tStudent('addStudent.backToDashboard'))}
              onClick={() => navigate('/')}
              className="font-dyslexia"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">
                {String(tStudent('addStudent.backToDashboard'))}
              </span>
            </Button>
            <LanguageSettings />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {String(tStudent('addStudent.title'))}
          </h1>
          <p className="text-muted-foreground">{String(tStudent('addStudent.description'))}</p>
        </div>

        {/* Form */}
        <Card className="bg-gradient-card border-0 shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="h-5 w-5" />
              {String(tStudent('profile.information'))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name - Required */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {String(tStudent('addStudent.form.name.label'))} *
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    // Clear error on change
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: '' }));
                    }
                  }}
                  placeholder={String(tStudent('addStudent.form.name.placeholder'))}
                  className={`font-dyslexia bg-input border-border focus:ring-ring ${errors.name ? 'border-red-500' : ''}`}
                  required
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-red-500 mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Grade - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {String(tStudent('addStudent.form.grade.label'))}
                </label>
                <Input
                  type="text"
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    if (errors.grade) {
                      setErrors((prev) => ({ ...prev, grade: '' }));
                    }
                  }}
                  placeholder={String(tStudent('addStudent.form.grade.placeholder'))}
                  className={`font-dyslexia bg-input border-border focus:ring-ring ${errors.grade ? 'border-red-500' : ''}`}
                  aria-invalid={!!errors.grade}
                  aria-describedby={errors.grade ? 'grade-error' : undefined}
                />
                {errors.grade && (
                  <p id="grade-error" className="text-sm text-red-500 mt-1">
                    {errors.grade}
                  </p>
                )}
              </div>

              {/* Date of Birth - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {String(tStudent('addStudent.form.dateOfBirth.label'))}
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    if (errors.dateOfBirth) {
                      setErrors((prev) => ({ ...prev, dateOfBirth: '' }));
                    }
                  }}
                  className={`font-dyslexia bg-input border-border focus:ring-ring ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                  aria-invalid={!!errors.dateOfBirth}
                  aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined}
                />
                {errors.dateOfBirth && (
                  <p id="dateOfBirth-error" className="text-sm text-red-500 mt-1">
                    {errors.dateOfBirth}
                  </p>
                )}
              </div>

              {/* Notes - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {String(tStudent('addStudent.form.notes.label'))}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (errors.notes) {
                      setErrors((prev) => ({ ...prev, notes: '' }));
                    }
                  }}
                  placeholder={String(tStudent('addStudent.form.notes.placeholder'))}
                  className={`font-dyslexia bg-input border-border focus:ring-ring ${errors.notes ? 'border-red-500' : ''}`}
                  rows={4}
                  aria-invalid={!!errors.notes}
                  aria-describedby={errors.notes ? 'notes-error' : undefined}
                />
                {errors.notes && (
                  <p id="notes-error" className="text-sm text-red-500 mt-1">
                    {errors.notes}
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="flex-1 font-dyslexia"
                  disabled={isLoading}
                >
                  {String(tCommon('buttons.cancel'))}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {String(tCommon('status.saving'))}
                    </div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {String(tCommon('buttons.add'))}{' '}
                      {String(tCommon('navigation.students')).slice(0, -1)}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Helper Text */}
        <div className="mt-6 p-4 bg-accent/50 rounded-lg border border-accent">
          <h3 className="font-medium text-accent-foreground mb-2">
            {String(tStudent('addStudent.helpText'))}
          </h3>
          <p className="text-sm text-accent-foreground/80">
            {String(tStudent('addStudent.helpText'))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddStudent;
