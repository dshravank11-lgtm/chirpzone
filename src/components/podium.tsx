'use client';

import React from 'react';
import { User } from "@/services/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Crown } from "lucide-react";
import { motion } from "framer-motion";

interface PodiumProps {
    topChirpers: any[];
    onSelectUser: (userId: string) => void;
}

const Podium: React.FC<PodiumProps> = ({ topChirpers, onSelectUser }) => {
    // Standard podium visual order: 2nd place (left), 1st place (center), 3rd place (right)
    const podiumOrder = [1, 0, 2];

    return (
        <div className="flex justify-center items-end w-full px-2 py-10 overflow-x-auto">
            <div className="flex justify-center items-end gap-2 md:gap-8 min-w-max">
                {podiumOrder.map((index) => {
                    const chirper = topChirpers[index];
                    if (!chirper) return <div key={`empty-${index}`} className="w-24 md:w-32" />;

                    // Logic based on rank
                    const isFirst = chirper.rank === 1;
                    const isSecond = chirper.rank === 2;
                    const isThird = chirper.rank === 3;

                    return (
                        <motion.div
                            key={chirper.id || chirper.uid}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex flex-col items-center cursor-pointer group ${
                                isFirst ? 'z-10 -mt-10' : 'z-0'
                            }`}
                            onClick={() => onSelectUser(chirper.id || chirper.uid)}
                        >
                            {/* Crown for #1 */}
                            <div className="h-10 flex items-center justify-center">
                                {isFirst && (
                                    <motion.div
                                        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                    >
                                        <Crown className="h-10 w-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Profile Picture / Avatar */}
                            <div className="relative">
                                {/* Rank Badge overlay */}
                                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 z-20 ${
                                    isFirst ? 'bg-yellow-500 border-yellow-200 text-black' : 
                                    isSecond ? 'bg-gray-400 border-gray-200 text-black' : 
                                    'bg-orange-700 border-orange-400 text-white'
                                }`}>
                                    {chirper.rank}
                                </div>

                                <Avatar className={`transition-all duration-300 group-hover:scale-105 border-4 shadow-2xl ${
                                    isFirst ? 'h-32 w-32 md:h-40 md:w-40 border-yellow-500 ring-4 ring-yellow-500/20' : 
                                    isSecond ? 'h-24 w-24 md:h-28 md:w-28 border-gray-400' : 
                                    'h-20 w-20 md:h-24 md:w-24 border-orange-800'
                                }`}>
                                    <AvatarImage 
                                        src={chirper.avatarUrl} 
                                        alt={chirper.name} 
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-muted text-2xl font-bold">
                                        {chirper.name?.substring(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* User Info */}
                            <div className="mt-4 text-center">
                                <p className={`font-bold truncate max-w-[120px] md:max-w-[160px] ${
                                    isFirst ? 'text-xl' : 'text-base'
                                }`}>
                                    {chirper.name}
                                </p>
                                <p className="text-xs text-muted-foreground">@{chirper.username}</p>
                                
                                <div className={`mt-2 px-3 py-1 rounded-full font-black text-sm inline-block ${
                                    isFirst ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                                    'bg-muted text-muted-foreground'
                                }`}>
                                    {chirper.chirpScore?.toLocaleString()}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default Podium;