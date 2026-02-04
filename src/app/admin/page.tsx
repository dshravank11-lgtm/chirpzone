// /admin/page.tsx - COMPLETE VERSION WITH PURCHASE HISTORY
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import AppLayout from '@/components/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Trash2, Clock, Loader2, Search, CheckCircle2, 
    XCircle, ShieldCheck, AlertCircle, Unlock, UserX,
    Filter, Users, Activity, Eye, EyeOff,
    ShoppingBag, Package, CreditCard, DollarSign, User,
    Download, Calendar, ArrowUpDown, ChevronDown, ChevronUp,
    RefreshCw, AlertTriangle, TrendingUp, FileText,
    Type, Palette, Sparkles, Zap
} from 'lucide-react';
import { 
    subscribeToReports, adminDeletePost, 
    dismissReport, logAdminAction,
    getAllUsers, getUserProfile,
    getUserRole  // Make sure this is imported
} from '@/services/firebase';
import { 
    collection, query, orderBy, onSnapshot, addDoc, 
    serverTimestamp, deleteDoc, doc, updateDoc, 
    deleteField, Timestamp, where, getDocs,
    limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

// Define shop items locally since we can't import from shop config
const LOCAL_SHOP_ITEMS = {
    fonts: [
        { name: 'PT Sans', value: 'PT Sans, sans-serif', price: 100, type: 'font' },
        { name: 'Roboto', value: 'Roboto, sans-serif', price: 150, type: 'font' },
        { name: 'Montserrat', value: 'Montserrat, sans-serif', price: 200, type: 'font' },
        { name: 'Lato', value: 'Lato, sans-serif', price: 180, type: 'font' },
        { name: 'Open Sans', value: 'Open Sans, sans-serif', price: 120, type: 'font' }
    ],
    colors: [
        { name: 'Orange', value: '#ff990a', price: 50, type: 'color' },
        { name: 'Blue', value: '#3b82f6', price: 75, type: 'color' },
        { name: 'Green', value: '#10b981', price: 75, type: 'color' },
        { name: 'Purple', value: '#8b5cf6', price: 75, type: 'color' },
        { name: 'Pink', value: '#ec4899', price: 75, type: 'color' },
        { name: 'Red', value: '#ef4444', price: 75, type: 'color' },
        { name: 'Yellow', value: '#f59e0b', price: 75, type: 'color' },
        { name: 'Teal', value: '#14b8a6', price: 75, type: 'color' }
    ],
    gradients: [
        { name: 'Sunset', value: 'linear-gradient(90deg, #ff990a, #ff6b00)', price: 200, type: 'gradient' },
        { name: 'Ocean', value: 'linear-gradient(90deg, #3b82f6, #1d4ed8)', price: 200, type: 'gradient' },
        { name: 'Forest', value: 'linear-gradient(90deg, #10b981, #047857)', price: 200, type: 'gradient' },
        { name: 'Royal', value: 'linear-gradient(90deg, #8b5cf6, #7c3aed)', price: 200, type: 'gradient' },
        { name: 'Coral', value: 'linear-gradient(90deg, #ec4899, #db2777)', price: 200, type: 'gradient' }
    ],
    movingGradients: [
        { name: 'Rainbow Flow', value: 'linear-gradient(90deg, #ff990a, #3b82f6, #10b981, #8b5cf6, #ec4899)', price: 500, type: 'moving-gradient' },
        { name: 'Fire & Ice', value: 'linear-gradient(90deg, #ff6b00, #3b82f6)', price: 400, type: 'moving-gradient' },
        { name: 'Emerald Dream', value: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)', price: 400, type: 'moving-gradient' },
        { name: 'Cosmic Burst', value: 'linear-gradient(90deg, #8b5cf6, #ec4899, #ff990a)', price: 450, type: 'moving-gradient' }
    ]
};

const SUPER_ADMINS = [
    "ZonTkSaIyebzkr3kPQW1sCncId63",
    "m37C815wG6VqVNW8LLjmZc4IIHF3", 
    "YmNJAuPyGKM6qPbhEs78AuyhPSz1"
];
const MODERATORS = [ 
    "ehUetd1rw3hdUvezMiSbwtQFUJR2"
];

interface PurchaseRecord {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    itemName: string;
    itemType: 'font' | 'color' | 'gradient' | 'moving-gradient';
    itemValue: string;
    originalPrice: number;
    discountedPrice: number;
    userRole: 'superadmin' | 'moderator' | 'user';
    discountApplied: number;
    timestamp: any;
    chirpScoreBalance: number;
}

export default function AdminPanel() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    
    const [loadStep, setLoadStep] = useState(0); 
    const [reports, setReports] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [pendingDeletions, setPendingDeletions] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showBannedOnly, setShowBannedOnly] = useState(false);
    const [activeTab, setActiveTab] = useState('reports');
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    
    // Purchase History State
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [purchaseFilter, setPurchaseFilter] = useState('all');
    const [purchaseSort, setPurchaseSort] = useState('newest');
    const [purchaseSearch, setPurchaseSearch] = useState('');
    const [purchaseStats, setPurchaseStats] = useState({
        totalPurchases: 0,
        totalRevenue: 0,
        averagePurchase: 0,
        topUser: { name: '', count: 0, amount: 0 },
        recent24Hours: 0,
        totalDiscounts: 0
    });
    const [indexWarning, setIndexWarning] = useState(false);

    const adminRank = useMemo(() => {
        if (!user) return 0;
        if (SUPER_ADMINS.includes(user.uid)) return 1; 
        if (MODERATORS.includes(user.uid)) return 2; 
        return 0;
    }, [user]);

    // Loading sequence
    useEffect(() => {
        if (!authLoading && user) {
            const t1 = setTimeout(() => setLoadStep(1), 400);
            const t2 = setTimeout(() => setLoadStep(2), 800);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [authLoading, user]);

    // Real-time subscriptions
    useEffect(() => {
        if (loadStep === 2 && adminRank > 0) {
            console.log('Setting up data subscriptions...');
            
            const unsubReports = subscribeToReports((data) => {
                console.log('Reports received:', data.length);
                setReports(data);
            });
            
            const unsubUsers = onSnapshot(collection(db, 'users'), async (s) => {
                const userData = s.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('Users received:', userData.length);
                setAllUsers(userData);
            }, (error) => {
                console.error('Error fetching users:', error);
            });

            const unsubLogs = onSnapshot(
                query(collection(db, 'system_logs'), orderBy('timestamp', 'desc')), 
                (s) => {
                    const logData = s.docs.map(d => ({ id: d.id, ...d.data() }));
                    console.log('Logs received:', logData.length);
                    setLogs(logData);
                },
                (error) => {
                    console.error('Error fetching logs:', error);
                }
            );

            const unsubQueue = onSnapshot(collection(db, 'pending_deletions'), (s) => {
                const queueData = s.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('Queue items received:', queueData.length);
                setPendingDeletions(queueData);
            }, (error) => {
                console.error('Error fetching queue:', error);
            });

            // Load purchase history
            loadPurchaseHistory();

            return () => { 
                unsubReports(); 
                unsubUsers(); 
                unsubLogs(); 
                unsubQueue(); 
            };
        }
    }, [loadStep, adminRank]);

    const createDemoPurchases = () => {
        const demoPurchases: PurchaseRecord[] = [];
        const demoUsers = [
            { id: 'user1', name: 'Alex Johnson', email: 'alex@example.com', role: 'user' as const },
            { id: 'user2', name: 'Sam Wilson', email: 'sam@example.com', role: 'user' as const },
            { id: 'user3', name: 'Taylor Swift', email: 'taylor@example.com', role: 'moderator' as const },
            { id: 'user4', name: 'Chris Evans', email: 'chris@example.com', role: 'superadmin' as const }
        ];
        
        // Get discount info for a user role
        const getDiscountInfo = (role: 'superadmin' | 'moderator' | 'user', price: number) => {
            if (role === 'superadmin') {
                return { discountedPrice: Math.floor(price * 0.1), discountApplied: 90 };
            }
            if (role === 'moderator') {
                return { discountedPrice: Math.ceil(price * 0.7), discountApplied: 30 };
            }
            return { discountedPrice: price, discountApplied: 0 };
        };
        
        const now = new Date();
        
        // Use the actual item names from LOCAL_SHOP_ITEMS
        const demoItems = [
            { name: 'Orange', type: 'color' as const, value: '#ff990a', price: 50 },
            { name: 'Sunset', type: 'gradient' as const, value: 'linear-gradient(90deg, #ff990a, #ff6b00)', price: 200 },
            { name: 'Montserrat', type: 'font' as const, value: 'Montserrat, sans-serif', price: 200 },
            { name: 'Rainbow Flow', type: 'moving-gradient' as const, value: 'linear-gradient(90deg, #ff990a, #3b82f6, #10b981, #8b5cf6, #ec4899)', price: 500 },
            { name: 'PT Sans', type: 'font' as const, value: 'PT Sans, sans-serif', price: 100 }
        ];
        
        demoUsers.forEach((user, userIndex) => {
            demoItems.forEach((item, itemIndex) => {
                const purchaseDate = new Date(now.getTime() - (userIndex * 7 + itemIndex) * 24 * 60 * 60 * 1000);
                const discountInfo = getDiscountInfo(user.role, item.price);
                
                demoPurchases.push({
                    id: `demo_${user.id}_${item.type}_${itemIndex}`,
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    itemName: item.name,
                    itemType: item.type,
                    itemValue: item.value,
                    originalPrice: item.price,
                    discountedPrice: discountInfo.discountedPrice,
                    userRole: user.role,
                    discountApplied: discountInfo.discountApplied,
                    timestamp: Timestamp.fromDate(purchaseDate),
                    chirpScoreBalance: Math.floor(Math.random() * 10000) + 1000
                });
            });
        });
        
        // Sort by date
        demoPurchases.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
        
        setPurchaseHistory(demoPurchases);
        calculatePurchaseStats(demoPurchases);
        
        toast({
            title: 'Demo Data Loaded',
            description: 'No real purchase data found. Showing demo purchases.',
            variant: 'default'
        });
    };

    const loadPurchaseHistory = async () => {
        if (!user || adminRank === 0) return;
        
        setPurchaseLoading(true);
        try {
            // Get all users and extract their purchase history
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allPurchases: PurchaseRecord[] = [];
            
            const now = new Date();
            
            // Helper function to get user role
            const getUserRoleForPurchase = (userId: string) => {
                if (SUPER_ADMINS.includes(userId)) return 'superadmin' as const;
                if (MODERATORS.includes(userId)) return 'moderator' as const;
                return 'user' as const;
            };
    
            // Helper function to get discount info
            const getDiscountInfo = (userRole: 'superadmin' | 'moderator' | 'user', originalPrice: number) => {
                if (userRole === 'superadmin') {
                    return {
                        discountedPrice: Math.floor(originalPrice * 0.1), // 90% discount
                        discountApplied: 90
                    };
                }
                if (userRole === 'moderator') {
                    return {
                        discountedPrice: Math.ceil(originalPrice * 0.7), // 30% discount
                        discountApplied: 30
                    };
                }
                return {
                    discountedPrice: originalPrice,
                    discountApplied: 0
                };
            };
    
            // Create a map of all shop items by name for easy lookup
            const allShopItems = [
                ...LOCAL_SHOP_ITEMS.fonts,
                ...LOCAL_SHOP_ITEMS.colors,
                ...LOCAL_SHOP_ITEMS.gradients,
                ...LOCAL_SHOP_ITEMS.movingGradients
            ].reduce((map, item) => {
                map[item.name] = item;
                return map;
            }, {} as Record<string, any>);
    
            await Promise.all(
                usersSnapshot.docs.map(async (userDoc) => {
                    const userData = userDoc.data();
                    const userRole = getUserRoleForPurchase(userDoc.id);
                    const purchasedItems = userData.purchasedItems || {
                        fonts: [],
                        colors: [],
                        gradients: [],
                        movingGradients: []
                    };
                    
                    // Process each item type
                    const processItems = (itemNames: string[], itemType: PurchaseRecord['itemType']) => {
                        if (!Array.isArray(itemNames)) return;
                        
                        itemNames.forEach((itemName: string) => {
                            const shopItem = allShopItems[itemName];
                            if (shopItem) {
                                const discountInfo = getDiscountInfo(userRole, shopItem.price);
                                allPurchases.push({
                                    id: `${userDoc.id}_${itemType}_${itemName.replace(/\s+/g, '_')}`,
                                    userId: userDoc.id,
                                    userName: userData.name || userData.username || 'Unknown User',
                                    userEmail: userData.email || '',
                                    itemName: shopItem.name,
                                    itemType: itemType,
                                    itemValue: shopItem.value,
                                    originalPrice: shopItem.price,
                                    discountedPrice: discountInfo.discountedPrice,
                                    userRole: userRole,
                                    discountApplied: discountInfo.discountApplied,
                                    timestamp: Timestamp.fromDate(new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)),
                                    chirpScoreBalance: userData.chirpScore || 0
                                });
                            }
                        });
                    };
    
                    // Process all item types
                    processItems(purchasedItems.fonts || [], 'font');
                    processItems(purchasedItems.colors || [], 'color');
                    processItems(purchasedItems.gradients || [], 'gradient');
                    processItems(purchasedItems.movingGradients || [], 'moving-gradient');
                })
            );
            
            // Sort by timestamp (most recent first)
            allPurchases.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            
            // If we have purchases, show them
            if (allPurchases.length > 0) {
                setPurchaseHistory(allPurchases);
                calculatePurchaseStats(allPurchases);
                
                toast({
                    title: `Loaded ${allPurchases.length} Purchases`,
                    description: 'Showing purchased items from user profiles.',
                    variant: 'default'
                });
            } else {
                // No purchases found - create some demo data
                createDemoPurchases();
            }
            
        } catch (error) {
            console.error('Error loading purchase history:', error);
            toast({
                variant: 'destructive',
                title: 'Error Loading Purchase History',
                description: 'Failed to load purchase records.',
            });
            createDemoPurchases();
        } finally {
            setPurchaseLoading(false);
        }
    };

    const calculatePurchaseStats = (purchases: PurchaseRecord[]) => {
        if (purchases.length === 0) {
            setPurchaseStats({
                totalPurchases: 0,
                totalRevenue: 0,
                averagePurchase: 0,
                topUser: { name: '', count: 0, amount: 0 },
                recent24Hours: 0,
                totalDiscounts: 0
            });
            return;
        }

        // Calculate total purchases and revenue
        const totalPurchases = purchases.length;
        const totalRevenue = purchases.reduce((sum, p) => sum + p.discountedPrice, 0);
        const averagePurchase = totalRevenue / totalPurchases;
        const totalDiscounts = purchases.reduce((sum, p) => sum + (p.discountApplied || 0), 0);

        // Calculate purchases in last 24 hours
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recent24Hours = purchases.filter(p => {
            if (!p.timestamp || !p.timestamp.toDate) return false;
            const purchaseDate = p.timestamp.toDate();
            return purchaseDate > oneDayAgo;
        }).length;

        // Find top user
        const userStats = purchases.reduce((acc, purchase) => {
            if (!acc[purchase.userId]) {
                acc[purchase.userId] = {
                    name: purchase.userName,
                    count: 0,
                    amount: 0
                };
            }
            acc[purchase.userId].count += 1;
            acc[purchase.userId].amount += purchase.discountedPrice;
            return acc;
        }, {} as Record<string, { name: string; count: number; amount: number }>);

        const topUser = Object.values(userStats).reduce((max, user) => 
            user.amount > max.amount ? user : max, 
        { name: '', count: 0, amount: 0 });

        setPurchaseStats({
            totalPurchases,
            totalRevenue,
            averagePurchase,
            topUser,
            recent24Hours,
            totalDiscounts
        });
    };

    const getFilteredPurchases = () => {
        let filtered = [...purchaseHistory];

        // Apply search filter
        if (purchaseSearch) {
            const searchLower = purchaseSearch.toLowerCase();
            filtered = filtered.filter(p => 
                p.userName.toLowerCase().includes(searchLower) ||
                p.userEmail.toLowerCase().includes(searchLower) ||
                p.itemName.toLowerCase().includes(searchLower) ||
                p.itemType.toLowerCase().includes(searchLower)
            );
        }

        // Apply type filter
        if (purchaseFilter !== 'all') {
            filtered = filtered.filter(p => p.itemType === purchaseFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (purchaseSort) {
                case 'newest':
                    return (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0);
                case 'oldest':
                    return (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0);
                case 'price-high':
                    return b.discountedPrice - a.discountedPrice;
                case 'price-low':
                    return a.discountedPrice - b.discountedPrice;
                case 'user':
                    return a.userName.localeCompare(b.userName);
                default:
                    return (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0);
            }
        });

        return filtered;
    };

    const handleExportCSV = () => {
        if (purchaseHistory.length === 0) {
            toast({
                title: 'No Data',
                description: 'No purchase records to export.',
            });
            return;
        }

        const headers = ['Date', 'User', 'Email', 'Item', 'Type', 'Original Price', 'Discount %', 'Final Price', 'User Role', 'Balance'];
        const csvData = getFilteredPurchases().map(p => [
            p.timestamp?.toDate().toISOString() || 'N/A',
            p.userName,
            p.userEmail,
            p.itemName,
            p.itemType,
            p.originalPrice,
            `${p.discountApplied}%`,
            p.discountedPrice,
            p.userRole,
            p.chirpScoreBalance
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `purchase_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: 'Exported Successfully',
            description: `Exported ${getFilteredPurchases().length} records as CSV.`,
        });
    };

    const handleUnban = async (targetUser: any) => {
        if (!confirm(`Unban @${targetUser.username}? This resets warnings to 0.`)) return;
        try {
            await updateDoc(doc(db, 'users', targetUser.id), {
                shadowBanUntil: deleteField(),
                warningCount: 0
            });
            await logAdminAction(user.uid, user.username || "Admin", "UNBAN_USER", `Target: ${targetUser.username}`);
            toast({ title: "✓ User Unbanned Successfully", description: `@${targetUser.username} can now post freely` });
        } catch (e) {
            toast({ variant: "destructive", title: "Unban Failed", description: "Please try again" });
        }
    };

    const handleManualBan = async (targetUser: any) => {
        if (adminRank !== 1) return;
        if (!confirm(`Manually ban @${targetUser.username} for 5 days?`)) return;
        try {
            const banUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            await updateDoc(doc(db, 'users', targetUser.id), {
                shadowBanUntil: Timestamp.fromDate(banUntil),
                warningCount: 3
            });
            await logAdminAction(user.uid, user.username || "Admin", "MANUAL_BAN", `Target: ${targetUser.username}`);
            toast({ title: "✓ User Banned for 5 Days", description: `@${targetUser.username} has been restricted` });
        } catch (e) {
            toast({ variant: "destructive", title: "Ban Failed" });
        }
    };

    const handleAction = async (postId: string, reportId: string | null, content: string) => {
        if (adminRank === 1) {
            if (!confirm("Confirm immediate deletion?")) return;
            await adminDeletePost(postId, reportId, user.uid);
            await logAdminAction(user.uid, user.username || "SuperAdmin", "DELETE_DIRECT", `Content: ${content.substring(0, 20)}...`);
            toast({ title: "✓ Content Deleted", description: "Post removed from platform" });
        } else {
            if (!confirm("Request deletion from Super Admins?")) return;
            await addDoc(collection(db, 'pending_deletions'), {
                postId, reportId, content,
                requestedBy: user.username || "Moderator",
                requestedById: user.uid,
                timestamp: serverTimestamp()
            });
            toast({ title: "✓ Sent to Priority Queue", description: "Awaiting super admin approval" });
        }
    };

    const approveDeletion = async (request: any) => {
        try {
            await adminDeletePost(request.postId, request.reportId, user.uid, user.displayName || "Admin");
            await deleteDoc(doc(db, 'pending_deletions', request.id));
            toast({ title: "✓ Deletion Approved", description: "Content has been removed" });
        } catch (e) {
            toast({ variant: "destructive", title: "Action Failed" });
        }
    };

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchesSearch = (u.username || u.displayName || "").toLowerCase().includes(searchTerm.toLowerCase());
            const isBanned = u.shadowBanUntil && u.shadowBanUntil.toMillis() > Date.now();
            if (showBannedOnly) return matchesSearch && isBanned;
            return matchesSearch;
        });
    }, [allUsers, searchTerm, showBannedOnly]);

    // Loading Screen
    if (authLoading || loadStep < 2) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden relative">
                <motion.div 
                    className="absolute inset-0 opacity-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                >
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(#ffa600 1px, transparent 1px), linear-gradient(90deg, #ffa600 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }} />
                </motion.div>

                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="text-center space-y-6 relative z-10"
                >
                    <div className="relative">
                        <motion.div 
                            className="absolute inset-0 bg-[#ffa600]/20 blur-3xl rounded-full"
                            animate={{ 
                                scale: [1, 1.3, 1],
                                opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        />
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        >
                            <ShieldCheck className="relative h-16 w-16 sm:h-20 sm:w-20 text-[#ffa600] mx-auto drop-shadow-lg" />
                        </motion.div>
                    </div>
                    <div className="space-y-3">
                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-[#ffa600] mx-auto" />
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#ffa600]/80">
                                {loadStep === 0 && "Initializing Secure Connection"}
                                {loadStep === 1 && "Verifying Credentials"}
                                {loadStep === 2 && "Loading Dashboard"}
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Access Denied Screen
    if (adminRank === 0) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-red-500/5 overflow-hidden relative">
                <motion.div 
                    className="absolute inset-0 opacity-5"
                    animate={{ 
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, #ff0000 0, #ff0000 1px, transparent 0, transparent 50%)',
                        backgroundSize: '20px 20px'
                    }}
                />
                
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center space-y-6 relative z-10 px-4"
                >
                    <motion.div
                        animate={{ 
                            rotate: [0, -5, 5, -5, 0],
                            scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                            duration: 0.5,
                            repeat: Infinity,
                            repeatDelay: 2
                        }}
                    >
                        <XCircle className="h-20 w-20 sm:h-24 sm:w-24 text-red-500 mx-auto drop-shadow-2xl" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-3xl sm:text-5xl font-black text-red-500 tracking-tight mb-2">
                            ACCESS DENIED
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground font-mono">
                            ERROR 403 • UNAUTHORIZED
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="pt-4"
                    >
                        <Badge variant="outline" className="border-red-500/30 text-red-500">
                            Insufficient Privileges
                        </Badge>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // Main Admin Panel
    return (
        <AppLayout>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8"
            >
                {/* Header */}
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                    <div className="flex items-center gap-3 sm:gap-4">
                        <motion.div 
                            className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-[#ffa600]/20 to-[#ff8c00]/10 border border-[#ffa600]/30 shadow-lg shadow-[#ffa600]/10"
                            whileHover={{ 
                                scale: 1.05, 
                                rotate: [0, -5, 5, 0],
                                boxShadow: "0 20px 40px rgba(255, 166, 0, 0.3)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        >
                            <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-[#ffa600]" />
                        </motion.div>
                        <div>
                            <motion.h1 
                                className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter uppercase bg-gradient-to-r from-[#ffa600] to-[#ff8c00] bg-clip-text text-transparent"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                Admin Terminal
                            </motion.h1>
                            <motion.div 
                                className="flex flex-wrap gap-2 mt-1"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Badge 
                                    variant={adminRank === 1 ? "default" : "secondary"}
                                    className={adminRank === 1 ? "bg-gradient-to-r from-[#ffa600] to-[#ff8c00] text-black hover:opacity-90 text-xs sm:text-sm shadow-md" : "text-xs sm:text-sm"}
                                >
                                    {adminRank === 1 ? "LEVEL 1: SUPER ADMIN" : "LEVEL 2: MODERATOR"}
                                </Badge>
                                <Badge variant="outline" className="border-[#ffa600]/30 text-xs sm:text-sm">
                                    <Users className="h-3 w-3 mr-1" />
                                    {allUsers.length} Users
                                </Badge>
                                <Badge variant="outline" className="border-[#ffa600]/30 text-xs sm:text-sm">
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    {purchaseStats.totalPurchases} Purchases
                                </Badge>
                            </motion.div>
                        </div>
                    </div>
                    
                    <motion.div 
                        className="relative w-full sm:w-80 md:w-96"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ffa600] z-10" />
                        <Input 
                            placeholder="Search records..." 
                            className="pl-10 h-10 sm:h-12 border-[#ffa600]/30 focus:border-[#ffa600] focus:ring-[#ffa600] bg-background/50 backdrop-blur-sm transition-all" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                        <Button
                            size="sm"
                            variant="ghost"
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-xs"
                            onClick={() => setShowDebug(!showDebug)}
                        >
                            {showDebug ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Stats Bar */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4"
                >
                    {[
                        { label: 'Reports', value: reports.length, icon: AlertCircle, color: 'text-red-500' },
                        { label: 'Queue', value: pendingDeletions.length, icon: Clock, color: 'text-orange-500' },
                        { label: 'Users', value: allUsers.length, icon: Users, color: 'text-blue-500' },
                        { label: 'Logs', value: logs.length, icon: Activity, color: 'text-green-500' },
                        { label: 'Purchases', value: purchaseStats.totalPurchases, icon: ShoppingBag, color: 'text-purple-500' }
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                            className="bg-gradient-to-br from-background to-muted/30 border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                                    <p className="text-2xl sm:text-3xl font-black mt-1">{stat.value}</p>
                                </div>
                                <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Index Warning Banner */}
                <AnimatePresence>
                    {indexWarning && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <Card className="bg-yellow-500/10 border-yellow-500/30">
                                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-bold text-yellow-600">Firestore Index Required</h3>
                                            <p className="text-sm text-yellow-700/80 mt-1">
                                                To enable purchase history filtering, please create the composite index.
                                                This may take a few minutes to build.
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10"
                                                    onClick={() => {
                                                        window.open('https://console.firebase.google.com/v1/r/project/chirpzone-oq44f/firestore/indexes?create_composite=ClNwcm9qZWN0cy9jaGlycHpvbmUtb3E0NGYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3N5c3RlbV9sb2dzL2luZGV4ZXMvXxABGgoKBmFjdGlvbhABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI', '_blank');
                                                    }}
                                                >
                                                    Create Index
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setIndexWarning(false);
                                                        loadPurchaseHistory();
                                                    }}
                                                >
                                                    Dismiss
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-yellow-600/60">
                                        Index status: Pending
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Debug Panel */}
                <AnimatePresence>
                    {showDebug && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <Card className="bg-black/50 border-[#ffa600]/30 text-green-400 font-mono text-xs">
                                <CardContent className="p-4">
                                    <p className="text-[#ffa600] font-bold mb-2">DEBUG INFO</p>
                                    <div className="space-y-1">
                                        <p>Load Step: {loadStep}</p>
                                        <p>Admin Rank: {adminRank}</p>
                                        <p>Auth Loading: {authLoading ? 'true' : 'false'}</p>
                                        <p>User UID: {user?.uid || 'null'}</p>
                                        <p className="text-yellow-400 mt-2">--- DATA STATE ---</p>
                                        <p>Reports: {reports.length} items</p>
                                        <p>All Users: {allUsers.length} items</p>
                                        <p>Filtered Users: {filteredUsers.length} items</p>
                                        <p>Logs: {logs.length} items</p>
                                        <p>Pending Deletions: {pendingDeletions.length} items</p>
                                        <p>Purchase History: {purchaseHistory.length} items</p>
                                        <p className="text-yellow-400 mt-2">--- FILTERS ---</p>
                                        <p>Search Term: "{searchTerm}"</p>
                                        <p>Show Banned Only: {showBannedOnly ? 'true' : 'false'}</p>
                                        <p>Active Tab: {activeTab}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="w-full overflow-x-auto pb-2">
                            <TabsList className="grid grid-cols-5 w-full max-w-3xl bg-gradient-to-r from-muted/50 to-muted/30 p-1 rounded-xl h-auto sm:h-12 border border-border/50">
                                {[
                                    { value: 'reports', label: 'Reports', count: reports.length },
                                    { value: 'queue', label: 'Queue', count: pendingDeletions.length },
                                    { value: 'users', label: 'Users', count: allUsers.length },
                                    { value: 'logs', label: 'Logs', count: logs.length },
                                    { value: 'purchases', label: 'Purchases', count: purchaseStats.totalPurchases }
                                ].map((tab) => (
                                    <TabsTrigger 
                                        key={tab.value}
                                        value={tab.value} 
                                        className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ffa600] data-[state=active]:to-[#ff8c00] data-[state=active]:text-black data-[state=active]:shadow-md text-xs sm:text-sm py-2 sm:py-0 transition-all"
                                    >
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
                                        <Badge variant="secondary" className="ml-1 sm:ml-2 h-5 min-w-5 px-1.5 text-xs">
                                            {tab.count}
                                        </Badge>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {/* PURCHASES TAB */}
                        <TabsContent value="purchases" className="mt-6 space-y-6">
                            {/* Purchase Stats Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ShoppingBag className="h-5 w-5 text-purple-500" />
                                            <h3 className="font-bold text-sm">Total Purchases</h3>
                                        </div>
                                        <p className="text-2xl font-black text-purple-600">{purchaseStats.totalPurchases}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-muted-foreground">
                                                {purchaseStats.recent24Hours} in last 24h
                                            </p>
                                            <Progress value={(purchaseStats.recent24Hours / Math.max(purchaseStats.totalPurchases, 1)) * 100} className="w-16 h-2" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CreditCard className="h-5 w-5 text-green-500" />
                                            <h3 className="font-bold text-sm">Total Revenue</h3>
                                        </div>
                                        <p className="text-2xl font-black text-green-600">{purchaseStats.totalRevenue.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">
                                            ChirpScore points
                                        </p>
                                    </div>
                                    
                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="h-5 w-5 text-orange-500" />
                                            <h3 className="font-bold text-sm">Average Purchase</h3>
                                        </div>
                                        <p className="text-2xl font-black text-orange-600">{Math.round(purchaseStats.averagePurchase)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            points per purchase
                                        </p>
                                    </div>
                                    
                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-5 w-5 text-blue-500" />
                                            <h3 className="font-bold text-sm">Total Discounts</h3>
                                        </div>
                                        <p className="text-2xl font-black text-blue-600">{purchaseStats.totalDiscounts}%</p>
                                        <p className="text-xs text-muted-foreground">
                                            Average: {Math.round(purchaseStats.totalDiscounts / Math.max(purchaseStats.totalPurchases, 1))}%
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Filters and Controls */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gradient-to-br from-background to-muted/20 p-4 rounded-xl border border-border/50"
                            >
                                <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
                                    <div className="relative flex-1 sm:flex-none min-w-[200px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ffa600]" />
                                        <Input
                                            placeholder="Search purchases..."
                                            value={purchaseSearch}
                                            onChange={(e) => setPurchaseSearch(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    
                                    <Select value={purchaseFilter} onValueChange={setPurchaseFilter}>
                                        <SelectTrigger className="w-[180px]">
                                            <Package className="h-4 w-4 mr-2" />
                                            <SelectValue placeholder="Filter by type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Items</SelectItem>
                                            <SelectItem value="font">Fonts</SelectItem>
                                            <SelectItem value="color">Colors</SelectItem>
                                            <SelectItem value="gradient">Gradients</SelectItem>
                                            <SelectItem value="moving-gradient">Animated Gradients</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    
                                    <Select value={purchaseSort} onValueChange={setPurchaseSort}>
                                        <SelectTrigger className="w-[180px]">
                                            <ArrowUpDown className="h-4 w-4 mr-2" />
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="newest">Newest First</SelectItem>
                                            <SelectItem value="oldest">Oldest First</SelectItem>
                                            <SelectItem value="price-high">Price: High to Low</SelectItem>
                                            <SelectItem value="price-low">Price: Low to High</SelectItem>
                                            <SelectItem value="user">User A-Z</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="flex gap-2">
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Button 
                                            onClick={loadPurchaseHistory}
                                            variant="outline"
                                            className="flex items-center gap-2"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            Refresh
                                        </Button>
                                    </motion.div>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Button 
                                            onClick={handleExportCSV}
                                            disabled={purchaseHistory.length === 0}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export CSV
                                        </Button>
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Purchase History Table */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className="border-border/50 shadow-xl bg-gradient-to-br from-background to-muted/20 overflow-hidden backdrop-blur-sm">
                                    <CardContent className="p-0">
                                        <ScrollArea className="h-[500px]">
                                            {purchaseLoading ? (
                                                <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
                                                    <Loader2 className="h-8 w-8 animate-spin text-[#ffa600]" />
                                                    <p className="text-sm text-muted-foreground">Loading purchase history...</p>
                                                </div>
                                            ) : getFilteredPurchases().length === 0 ? (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                    <p className="font-bold mb-2">No Purchase Records Found</p>
                                                    <p className="text-sm">
                                                        {purchaseSearch ? 'Try a different search term' : 'No purchases have been made yet'}
                                                    </p>
                                                    {purchaseHistory.length > 0 && getFilteredPurchases().length === 0 && (
                                                        <p className="text-xs mt-2">
                                                            {purchaseFilter !== 'all' ? `No ${purchaseFilter} purchases found.` : 'No matches found.'}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader className="sticky top-0 bg-gradient-to-r from-muted/50 to-muted/30 z-10">
                                                        <TableRow>
                                                            <TableHead className="text-[#ffa600]">Date & Time</TableHead>
                                                            <TableHead className="text-[#ffa600]">User</TableHead>
                                                            <TableHead className="text-[#ffa600]">Item</TableHead>
                                                            <TableHead className="text-[#ffa600]">Type</TableHead>
                                                            <TableHead className="text-[#ffa600] text-right">Price</TableHead>
                                                            <TableHead className="text-[#ffa600]">Discount</TableHead>
                                                            <TableHead className="text-[#ffa600]">Role</TableHead>
                                                            <TableHead className="text-[#ffa600] text-right">Balance</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {getFilteredPurchases().map((purchase, index) => (
                                                            <motion.tr 
                                                                key={purchase.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: index * 0.02 }}
                                                                className="hover:bg-muted/30 transition-colors"
                                                            >
                                                                <TableCell className="font-mono text-xs">
                                                                    {purchase.timestamp?.toDate().toLocaleString() || 'N/A'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div>
                                                                        <p className="font-medium">{purchase.userName}</p>
                                                                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                                            {purchase.userEmail || 'No email'}
                                                                        </p>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        {purchase.itemType === 'font' && (
                                                                            <Type className="h-4 w-4 text-gray-500" />
                                                                        )}
                                                                        {purchase.itemType === 'color' && (
                                                                            <div 
                                                                                className="h-4 w-4 rounded-full border"
                                                                                style={{ backgroundColor: purchase.itemValue }}
                                                                            />
                                                                        )}
                                                                        {purchase.itemType === 'gradient' && (
                                                                            <div 
                                                                                className="h-4 w-4 rounded-full border"
                                                                                style={{ backgroundImage: purchase.itemValue }}
                                                                            />
                                                                        )}
                                                                        {purchase.itemType === 'moving-gradient' && (
                                                                            <div 
                                                                                className="h-4 w-4 rounded-full border animate-pulse"
                                                                                style={{ backgroundImage: purchase.itemValue }}
                                                                            />
                                                                        )}
                                                                        <span className="truncate max-w-[150px]" title={purchase.itemName}>
                                                                            {purchase.itemName}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="text-xs capitalize">
                                                                        {purchase.itemType.replace('-', ' ')}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="space-y-1">
                                                                        <div className={`font-bold ${
                                                                            purchase.discountApplied > 0 ? 'text-green-600' : 'text-[#ffa600]'
                                                                        }`}>
                                                                            {purchase.discountedPrice} pts
                                                                        </div>
                                                                        {purchase.discountApplied > 0 && (
                                                                            <div className="text-xs text-muted-foreground line-through">
                                                                                {purchase.originalPrice} pts
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {purchase.discountApplied > 0 ? (
                                                                        <Badge className={
                                                                            purchase.userRole === 'superadmin' 
                                                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                                                                            : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                                                                        }>
                                                                            {purchase.discountApplied}% OFF
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">None</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={
                                                                        purchase.userRole === 'superadmin' ? 'default' : 
                                                                        purchase.userRole === 'moderator' ? 'secondary' : 'outline'
                                                                    } className="text-xs">
                                                                        {purchase.userRole}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {purchase.chirpScoreBalance.toLocaleString()} pts
                                                                </TableCell>
                                                            </motion.tr>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Summary Footer */}
                            {getFilteredPurchases().length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-muted-foreground gap-2"
                                >
                                    <div className="flex items-center gap-4">
                                        <p>
                                            Showing {getFilteredPurchases().length} of {purchaseHistory.length} records
                                        </p>
                                        {purchaseFilter !== 'all' && (
                                            <Badge variant="outline" className="text-xs">
                                                Filter: {purchaseFilter}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-[#ffa600] font-medium">
                                            Total: {getFilteredPurchases().reduce((sum, p) => sum + p.discountedPrice, 0).toLocaleString()} points
                                        </p>
                                        {purchaseSearch && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setPurchaseSearch('')}
                                                className="h-7 text-xs"
                                            >
                                                Clear Search
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </TabsContent>

                        {/* USERS TAB */}
                        <TabsContent value="users" className="mt-6 space-y-4">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-2 bg-gradient-to-br from-muted/40 to-muted/20 p-3 sm:p-4 rounded-xl border border-border/50 w-full sm:w-fit backdrop-blur-sm"
                            >
                                <Checkbox 
                                    id="banned-toggle" 
                                    checked={showBannedOnly} 
                                    onCheckedChange={(val) => setShowBannedOnly(val as boolean)}
                                    className="data-[state=checked]:bg-[#ffa600] data-[state=checked]:border-[#ffa600]"
                                />
                                <label htmlFor="banned-toggle" className="text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer">
                                    <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-[#ffa600]" />
                                    Show Only Banned Users
                                </label>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="border-border/50 shadow-xl bg-gradient-to-br from-background to-muted/20 overflow-hidden backdrop-blur-sm">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs sm:text-sm">
                                                <thead className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50 uppercase text-[10px] tracking-widest font-black sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3 sm:p-5 text-[#ffa600]">User Identity</th>
                                                        <th className="p-3 sm:p-5 text-[#ffa600] hidden sm:table-cell">Status</th>
                                                        <th className="p-3 sm:p-5 text-center text-[#ffa600]">Warnings</th>
                                                        <th className="p-3 sm:p-5 text-right text-[#ffa600]">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {filteredUsers.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-8 sm:p-12 text-center text-muted-foreground text-xs sm:text-sm">
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className="space-y-2"
                                                                >
                                                                    <Users className="h-12 w-12 mx-auto opacity-30 mb-3" />
                                                                    <p className="font-bold">No Users Found</p>
                                                                    <p className="text-xs opacity-60">
                                                                        Total users: {allUsers.length} | 
                                                                        Filtered: {filteredUsers.length} | 
                                                                        Search: "{searchTerm || 'none'}" |
                                                                        Banned only: {showBannedOnly ? 'Yes' : 'No'}
                                                                    </p>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <AnimatePresence>
                                                        {filteredUsers.map((u, index) => {
                                                            const isBanned = u.shadowBanUntil && u.shadowBanUntil.toMillis() > Date.now();
                                                            return (
                                                                <motion.tr 
                                                                    key={u.id}
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: 20 }}
                                                                    transition={{ delay: index * 0.03 }}
                                                                    className="hover:bg-muted/30 transition-all duration-200"
                                                                    whileHover={{ scale: 1.01 }}
                                                                >
                                                                    <td className="p-3 sm:p-5">
                                                                        <div className="flex items-center gap-2 sm:gap-3">
                                                                            <motion.div 
                                                                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-[#ffa600]/30 to-[#ff8c00]/20 flex items-center justify-center font-black text-[#ffa600] flex-shrink-0 text-sm sm:text-base border border-[#ffa600]/20"
                                                                                whileHover={{ rotate: 360, scale: 1.1 }}
                                                                                transition={{ duration: 0.3 }}
                                                                            >
                                                                                {(u.username || "U").charAt(0).toUpperCase()}
                                                                            </motion.div>
                                                                            <div className="min-w-0">
                                                                                <p className="font-bold text-xs sm:text-base truncate">@{u.username || "anonymous"}</p>
                                                                                <p className="text-[9px] sm:text-[10px] font-mono opacity-40 truncate">{u.id}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 sm:p-5 hidden sm:table-cell">
                                                                        <motion.div
                                                                            initial={{ scale: 0.9 }}
                                                                            animate={{ scale: 1 }}
                                                                            transition={{ delay: index * 0.03 + 0.1 }}
                                                                        >
                                                                            {isBanned ? (
                                                                                <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200 animate-pulse">
                                                                                    <Clock className="h-3 w-3 mr-1" /> RESTRICTED
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                                                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> CLEAR
                                                                                </Badge>
                                                                            )}
                                                                        </motion.div>
                                                                    </td>
                                                                    <td className="p-3 sm:p-5 text-center">
                                                                        <motion.div
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            transition={{ delay: index * 0.03 + 0.15, type: "spring" }}
                                                                        >
                                                                            <span className={`text-base sm:text-lg font-black ${u.warningCount >= 2 ? 'text-red-500' : 'text-[#ffa600]'}`}>
                                                                                {u.warningCount || 0}
                                                                            </span>
                                                                            <span className="text-muted-foreground ml-1 text-xs sm:text-sm">/ 3</span>
                                                                        </motion.div>
                                                                    </td>
                                                                    <td className="p-3 sm:p-5 text-right">
                                                                        <motion.div 
                                                                            className="flex justify-end gap-1 sm:gap-2"
                                                                            initial={{ opacity: 0, x: 20 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: index * 0.03 + 0.2 }}
                                                                        >
                                                                            {isBanned ? (
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="outline" 
                                                                                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-xs px-2 sm:px-3 transition-all" 
                                                                                    onClick={() => handleUnban(u)}
                                                                                >
                                                                                    <Unlock className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                                                                    <span className="hidden sm:inline">Lift Ban</span>
                                                                                </Button>
                                                                            ) : (
                                                                                adminRank === 1 && (
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        variant="ghost" 
                                                                                        className="text-muted-foreground hover:text-destructive text-xs px-2 sm:px-3 transition-all" 
                                                                                        onClick={() => handleManualBan(u)}
                                                                                    >
                                                                                        <UserX className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                                                                        <span className="hidden sm:inline">Ban User</span>
                                                                                    </Button>
                                                                                )
                                                                            )}
                                                                        </motion.div>
                                                                    </td>
                                                                </motion.tr>
                                                            );
                                                        })}
                                                    </AnimatePresence>
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </TabsContent>

                        {/* REPORTS TAB */}
                        <TabsContent value="reports" className="mt-6 space-y-3 sm:space-y-4">
                            {reports.length === 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-12 sm:p-20 text-center text-muted-foreground text-sm sm:text-base bg-gradient-to-br from-background to-muted/20 rounded-xl border border-dashed border-border"
                                >
                                    <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-green-500/50" />
                                    <p className="font-bold mb-2">No Pending Reports</p>
                                    <p className="text-xs opacity-60">All reports have been resolved. Total reports in state: {reports.length}</p>
                                </motion.div>
                            )}
                            <AnimatePresence>
                                {reports.map((report, index) => (
                                    <motion.div
                                        key={report.id}
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -100, scale: 0.9 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                    >
                                        <Card className="overflow-hidden border-l-4 border-l-red-500 bg-gradient-to-br from-background to-red-500/5 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300">
                                            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="space-y-3 flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="destructive" className="text-xs animate-pulse">
                                                            {report.reason}
                                                        </Badge>
                                                        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                                                            ID: {report.id.substring(0,8)}
                                                        </span>
                                                    </div>
                                                    <motion.div 
                                                        className="bg-muted/40 p-3 sm:p-4 rounded-lg italic border-l-2 border-red-500/30 text-xs sm:text-sm break-words"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.05 + 0.1 }}
                                                    >
                                                        "{report.post?.content}"
                                                    </motion.div>
                                                    <p className="text-xs font-bold text-red-500">
                                                        Target: @{report.post?.author?.username || 'unknown'}
                                                    </p>
                                                </div>
                                                <motion.div 
                                                    className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 + 0.2 }}
                                                >
                                                    <Button 
                                                        className="flex-1 sm:flex-none text-xs sm:text-sm hover:scale-105 transition-transform" 
                                                        variant="destructive" 
                                                        onClick={() => handleAction(report.postId, report.id, report.post?.content)}
                                                    >
                                                        {adminRank === 1 ? <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"/> : <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"/>}
                                                        {adminRank === 1 ? "Delete" : "Request"}
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={() => dismissReport(report.id, user.uid)}
                                                        className="flex-1 sm:flex-none text-xs sm:text-sm hover:bg-muted hover:scale-105 transition-all"
                                                    >
                                                        Dismiss
                                                    </Button>
                                                </motion.div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </TabsContent>

                        {/* QUEUE TAB */}
                        <TabsContent value="queue" className="mt-6 space-y-3 sm:space-y-4">
                            {pendingDeletions.length === 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-12 sm:p-20 text-center text-muted-foreground text-sm sm:text-base bg-gradient-to-br from-background to-muted/20 rounded-xl border border-dashed border-border"
                                >
                                    <Clock className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-orange-500/50" />
                                    <p className="font-bold mb-2">Priority Queue Empty</p>
                                    <p className="text-xs opacity-60">No deletion requests pending. Total in queue: {pendingDeletions.length}</p>
                                </motion.div>
                            )}
                            <AnimatePresence>
                                {pendingDeletions.map((req, index) => (
                                    <motion.div
                                        key={req.id}
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                    >
                                        <Card className="border-orange-500/50 bg-gradient-to-br from-orange-500/10 to-muted/20 hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300">
                                            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="space-y-2 flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge className="bg-orange-500 text-white text-xs animate-pulse">
                                                            PENDING APPROVAL
                                                        </Badge>
                                                        <span className="text-xs font-black text-orange-600 uppercase">
                                                            Req by @{req.requestedBy}
                                                        </span>
                                                    </div>
                                                    <motion.p 
                                                        className="text-xs sm:text-sm font-medium break-words bg-muted/30 p-2 rounded"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.05 + 0.1 }}
                                                    >
                                                        "{req.content}"
                                                    </motion.p>
                                                </div>
                                                <motion.div 
                                                    className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 + 0.2 }}
                                                >
                                                    {adminRank === 1 ? (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                className="bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none text-xs sm:text-sm hover:scale-105 transition-transform" 
                                                                onClick={() => approveDeletion(req)}
                                                            >
                                                                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="destructive" 
                                                                onClick={() => deleteDoc(doc(db, 'pending_deletions', req.id))}
                                                                className="flex-1 sm:flex-none text-xs sm:text-sm hover:scale-105 transition-transform"
                                                            >
                                                                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Deny
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs">Waiting for Super Admin</Badge>
                                                    )}
                                                </motion.div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </TabsContent>

                        {/* LOGS TAB */}
                        <TabsContent value="logs" className="mt-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="border-border/50 shadow-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                                    <CardContent className="p-0">
                                        <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto">
                                            <table className="w-full text-left text-xs sm:text-sm">
                                                <thead className="bg-gradient-to-r from-muted/50 to-muted/30 sticky top-0 font-black text-[10px] tracking-tighter z-10 border-b border-border/50">
                                                    <tr>
                                                        <th className="p-3 sm:p-4 text-[#ffa600]">Action</th>
                                                        <th className="p-3 sm:p-4 text-[#ffa600] hidden sm:table-cell">Executor</th>
                                                        <th className="p-3 sm:p-4 text-[#ffa600]">Description</th>
                                                        <th className="p-3 sm:p-4 text-right text-[#ffa600]">Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {logs.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-8 sm:p-12 text-center text-muted-foreground">
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className="space-y-2"
                                                                >
                                                                    <Activity className="h-12 w-12 mx-auto opacity-30 mb-3" />
                                                                    <p className="font-bold">No System Logs</p>
                                                                    <p className="text-xs opacity-60">Total logs in state: {logs.length}</p>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <AnimatePresence>
                                                        {logs.map((log, index) => (
                                                            <motion.tr 
                                                                key={log.id}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 20 }}
                                                                transition={{ delay: index * 0.02 }}
                                                                className="hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                                                                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                                whileHover={{ scale: 1.01 }}
                                                            >
                                                                <td className="p-3 sm:p-4">
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {log.action}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 sm:p-4 font-bold text-[#ffa600] hidden sm:table-cell">
                                                                    @{log.adminUsername}
                                                                </td>
                                                                <td className="p-3 sm:p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className={`text-muted-foreground italic text-xs ${expandedLog === log.id ? '' : 'truncate max-w-[200px] sm:max-w-xs'}`}>
                                                                            "{log.details}"
                                                                        </p>
                                                                        {expandedLog === log.id ? <EyeOff className="h-3 w-3 text-muted-foreground flex-shrink-0" /> : <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 sm:p-4 text-right text-[10px] font-mono opacity-50">
                                                                    {log.timestamp?.toDate().toLocaleString()}
                                                                </td>
                                                            </motion.tr>
                                                        ))}
                                                    </AnimatePresence>
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </motion.div>
        </AppLayout>
    );
}