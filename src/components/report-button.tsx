import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { submitReport } from '@/services/reports';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface ReportDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ postId, open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (user) {
      try {
        await submitReport({ reason, reportedBy: user.uid, postId });
        toast({ title: 'Report submitted', description: 'The developers will take care of it.' });
        onOpenChange(false);
        setReason('');
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to submit report.', variant: 'destructive' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a Report</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Please provide a reason for your report..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogContent>
    </Dialog>
  );
};
