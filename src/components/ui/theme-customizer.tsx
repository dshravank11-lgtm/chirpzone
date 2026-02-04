
'use client';

import { useState } from 'react';
import { GithubPicker } from 'react-color';
import { Button } from '@/components/ui/button';
import { updateUserProfile } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';

export const ThemeCustomizer = () => {
    const { user } = useAuth();
    const [primaryColor, setPrimaryColor] = useState(user?.theme?.primary || '#000000');
    const [secondaryColor, setSecondaryColor] = useState(user?.theme?.secondary || '#ffffff');

    const handlePrimaryColorChange = (color) => {
        setPrimaryColor(color.hex);
    };

    const handleSecondaryColorChange = (color) => {
        setSecondaryColor(color.hex);
    };

    const handleSaveTheme = async () => {
        if (user) {
            await updateUserProfile(user.uid, { theme: { primary: primaryColor, secondary: secondaryColor } });
            // This will require a reload to see the changes
            window.location.reload();
        }
    };

    return (
        <div className="p-4">
            <h3 className="text-lg font-medium mb-2">Customize Your Theme</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-md font-medium mb-2">Primary Color</h4>
                    <GithubPicker color={primaryColor} onChangeComplete={handlePrimaryColorChange} />
                </div>
                <div>
                    <h4 className="text-md font-medium mb-2">Secondary Color</h4>
                    <GithubPicker color={secondaryColor} onChangeComplete={handleSecondaryColorChange} />
                </div>
            </div>
            <Button onClick={handleSaveTheme} className="mt-4">Save Theme</Button>
        </div>
    );
};
