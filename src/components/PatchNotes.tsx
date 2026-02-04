
"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Sparkles, Trophy } from "lucide-react";

const PATCH_NOTES_VERSION = "1.0.1"; // Increment to show again

export function PatchNotes() {
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem("patchNotesVersion");
    if (lastSeenVersion !== PATCH_NOTES_VERSION) {
      setShowPatchNotes(true);
    }
  }, []);

  const handleOpenChange = (open: boolean) => {
    setShowPatchNotes(open);
    if (!open) {
      localStorage.setItem("patchNotesVersion", PATCH_NOTES_VERSION);
    }
  };

  return (
    <Dialog open={showPatchNotes} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-orange-500" />
            What's New on Chirp?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <p>
            We've been hard at work making Chirp even better for you. Here are
            some of the exciting new features!
          </p>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold">Introducing Streaks!</h4>
                <p className="text-muted-foreground">
                  Build momentum with daily activity. Post or comment every day to
                  increase your streak and show off your dedication.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-semibold">Unlockable Achievements</h4>
                <p className="text-muted-foreground">
                  Showcase your accomplishments! Earn unique badges for reaching
                  milestones, like becoming a top commenter or a posting
                  powerhouse.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Sparkles className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h4 className="font-semibold">Profile Flair & Shop</h4>
                <p className="text-muted-foreground">
                  Express yourself! Visit the new Shop to customize your profile
                  with unique name colors, fonts, and special effects.
                </p>
              </div>
            </div>
          </div>

          <p>
            Plus, lots of smaller UI improvements and bug fixes to make your
            experience smoother than ever.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            Got it, thanks!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
