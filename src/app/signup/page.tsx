'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { GoogleIcon } from '@/components/icons/google-icon';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import { signUp, signInWithGoogle } from '@/services/firebase';

const steps = [
  { id: 'welcome', title: 'Welcome to Chirp' },
  { id: 'account', title: 'Create your account' },
  { id: 'profile', title: 'Tell us about yourself' },
  { id: 'interests', title: 'What are you into?' },
];

const features = [
  { title: 'Connect with Friends', description: 'Share moments and stay in touch with people who matter.', imageUrl: 'https://placehold.co/800x600.png', imageHint: 'friends connection' },
  { title: 'Go Anonymous', description: 'Use the Confess Corner to share your thoughts without revealing your identity.', imageUrl: 'https://placehold.co/800x600.png', imageHint: 'anonymous mask' },
  { title: 'Discover Communities', description: 'Join groups based on your hobbies and interests. Find your people!', imageUrl: 'https://placehold.co/800x600.png', imageHint: 'community groups' },
];

const interests = [
  "Technology", "Music", "Art", "Gaming", "Travel", "Food", 
  "Movies", "Books", "Sports", "Fashion", "Science", "Memes"
];

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    gender: '',
    dob: '',
    selectedInterests: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [api, setApi] = React.useState<CarouselApi>();
  const [currentFeature, setCurrentFeature] = React.useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrentFeature(api.selectedScrollSnap());
    api.on("select", () => setCurrentFeature(api.selectedScrollSnap()));
  }, [api]);

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => {
      const selectedInterests = prev.selectedInterests.includes(interest)
        ? prev.selectedInterests.filter(i => i !== interest)
        : [...prev.selectedInterests, interest];
      return { ...prev, selectedInterests };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, gender: value }));
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast({ 
        title: 'Account Created!',
        description: "Welcome to Chirp! You are now logged in."
      });
      router.push('/'); // Redirect to homepage
    } catch (error: any) {
      console.error("Google signup failed:", error);
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSignup = async () => {
    setIsLoading(true);
    try {
      if (!formData.password || !formData.email) {
        throw new Error("Email and password are required.");
      }

      await signUp(
        formData.email.trim(),
        formData.password,
        formData.name.trim()
      );
      
      setEmailSent(true);

      toast({
        title: 'Account Created!',
        description: "We\'ve sent a verification email to you. Please verify your email to log in.",
      });

    } catch (error: any) {
      console.error("Signup failed:", error);

      const errorMsg = error?.message || JSON.stringify(error);

      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="mx-auto max-w-lg w-full">
            <CardHeader className="text-center">
                <div className="flex justify-center items-center mb-4">
                    <h1 className="text-3xl font-bold text-primary">Chirp</h1>
                </div>
                { !emailSent &&
                    <>
                        <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
                        <Progress value={progressValue} className="w-full mt-4 h-2" />
                    </>
                }
            </CardHeader>
            <CardContent>
                {emailSent ? (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">Verify your email</h2>
                        <p className="mt-4">Weve sent a verification email to {formData.email}. Please check your inbox and follow the instructions to verify your account.</p>
                        <p className="mt-4">Once you have verified your email, you can log in to your account.</p>
                        <Button onClick={() => router.push('/login')} className="mt-4">Login</Button>
                    </div>
                ) : (
                    <>
                        {/* Step 0 - Welcome */}
                        {currentStep === 0 && (
                            <div className="space-y-4">
                                <Carousel 
                                    setApi={setApi}
                                    plugins={[Autoplay({ delay: 3000, stopOnInteraction: true })]}
                                    className="w-full"
                                >
                                    <CarouselContent>
                                        {features.map((feature, index) => (
                                            <CarouselItem key={index}>
                                                <div className="p-1">
                                                    <Card className="overflow-hidden border-0">
                                                        <CardContent className="flex flex-col items-center justify-center p-0">
                                                            <Image src={feature.imageUrl} alt={feature.title} width={400} height={300} className="w-full object-cover aspect-[4/3]" data-ai-hint={feature.imageHint}/>
                                                            <div className="p-4 bg-muted w-full">
                                                                <h3 className="font-semibold text-lg">{feature.title}</h3>
                                                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>
                                <div className="flex justify-center gap-2 mt-2">
                                    {features.map((_, index) => (
                                        <button key={index} onClick={() => api?.scrollTo(index)} className={`h-2 w-2 rounded-full ${index === currentFeature ? 'bg-primary' : 'bg-muted'}`} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 1 - Account */}
                        {currentStep === 1 && (
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="you@example.com" required value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" required value={formData.password} onChange={handleChange}/>
                                </div>
                                <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignUp} disabled={isLoading}>
                                    <GoogleIcon className="mr-2 h-4 w-4" />
                                    Sign up with Google
                                </Button>
                            </div>
                        )}

                        {/* Step 2 - Profile */}
                        {currentStep === 2 && (
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Full Name (Optional)</Label>
                                    <Input id="name" placeholder="John Doe" value={formData.name} onChange={handleChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <Select onValueChange={handleSelectChange} value={formData.gender}>
                                        <SelectTrigger id="gender">
                                            <SelectValue placeholder="Select your gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="non-binary">Non-binary</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input id="dob" type="date" required value={formData.dob} onChange={handleChange} />
                                </div>
                            </div>
                        )}

                        {/* Step 3 - Interests */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <CardDescription>Select at least 3 interests to personalize your feed.</CardDescription>
                                <div className="flex flex-wrap gap-2">
                                    {interests.map(interest => (
                                        <Badge
                                            key={interest}
                                            variant={formData.selectedInterests.includes(interest) ? 'default' : 'secondary'}
                                            className="cursor-pointer text-sm"
                                            onClick={() => handleInterestToggle(interest)}
                                        >
                                            {interest}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-6">
                            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                                Back
                            </Button>
                            {currentStep < steps.length - 1 ? (
                                <Button onClick={handleNext}>Next</Button>
                            ) : (
                                <Button onClick={handleFinishSignup} disabled={isLoading || formData.selectedInterests.length < 3}>
                                    {isLoading ? 'Finishing...' : 'Finish Signup'}
                                </Button>
                            )}
                        </div>

                        {/* Login link */}
                        <div className="mt-6 text-center text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="underline">
                                Login
                            </Link>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            By signing up, you agree to our{' '}
                            <Link href="/terms-of-service" className="text-blue-500 hover:underline">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy-policy" className="text-blue-500 hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    </div>
  );
}