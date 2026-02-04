'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Upload, User, FileText } from 'lucide-react';
import { updateUserProfile, uploadProfilePicture } from '@/services/firebase';
import { getCroppedImg } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function EditProfileDialog({ open, onOpenChange, user, onProfileUpdate }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setIsUploading(true);
    let avatarUrl = user.avatarUrl;

    if (imageSrc && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedImageFile = new File([croppedImage], 'avatar.jpeg', { type: 'image/jpeg' });
      avatarUrl = await uploadProfilePicture(user.uid, croppedImageFile);
    }

    const updatedProfile = {
      name,
      bio,
      avatarUrl,
    };

    await updateUserProfile(user.uid, updatedProfile);
    onProfileUpdate(updatedProfile);
    setIsUploading(false);
    setImageSrc(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
            setImageSrc(null);
        }
        onOpenChange(isOpen);
    }}>
      <DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] overflow-y-auto border-border/50 shadow-xl bg-gradient-to-br from-background via-background to-muted/20">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#ffa600]">Edit Profile</DialogTitle>
          <DialogDescription className="text-sm">
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {imageSrc ? (
            <motion.div 
              key="cropper"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="relative h-48 sm:h-64 w-full rounded-xl overflow-hidden border border-border/50">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                  showGrid={false}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Zoom</Label>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={(value) => setZoom(value[0])}
                  className="[&_[role=slider]]:bg-[#ffa600] [&_[role=slider]]:border-[#ffa600]"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setImageSrc(null)}
                className="w-full hover:bg-muted h-10 sm:h-auto"
              >
                Cancel Crop
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 py-2 sm:py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ffa600]" />
                  Name
                </Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="border-[#ffa600]/30 focus:border-[#ffa600] focus:ring-[#ffa600] h-10 sm:h-auto"
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ffa600]" />
                  Bio
                </Label>
                <Textarea 
                  id="bio" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="border-[#ffa600]/30 focus:border-[#ffa600] focus:ring-[#ffa600] min-h-[80px] sm:min-h-[100px] resize-none text-sm sm:text-base"
                  placeholder="Tell us about yourself..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatar" className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ffa600]" />
                  Profile Picture
                </Label>
                <div className="relative">
                  <Input 
                    id="avatar" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="border-[#ffa600]/30 focus:border-[#ffa600] focus:ring-[#ffa600] file:bg-[#ffa600]/10 file:text-[#ffa600] file:border-0 file:mr-2 sm:file:mr-4 file:px-2 sm:file:px-4 file:py-1.5 sm:file:py-2 file:rounded-md file:font-semibold file:text-xs sm:file:text-sm hover:file:bg-[#ffa600]/20 cursor-pointer text-sm h-10 sm:h-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Upload a new profile picture (JPG, PNG, or GIF)</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="w-full sm:w-auto hover:bg-muted h-10 order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isUploading}
            className="w-full sm:w-auto bg-[#ffa600] hover:bg-[#ff8c00] text-black font-semibold h-10 order-1 sm:order-2"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}