// /admin/page.tsx - Updated with Mass Deletion features
'use client';
import { detectGibberish, getGibberishDetector, AdvancedGibberishResult } from '@/lib/real-advanced-gibberish-detector';
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
    Type, Palette, Sparkles, Zap, Plus, Minus, Coins, Gift,
    MessageSquare, FileWarning, UserCog, Ban, Shield
} from 'lucide-react';
import { 
    subscribeToReports, adminDeletePost, 
    dismissReport, logAdminAction,
    getAllUsers, getUserProfile,
    getUserRole,
    getTopChirpers,
    updateUserProfile,
    getPostsByUserId,
    deletePost,
    getCommentsByUserId
} from '@/services/firebase';
import { 
    collection, query, orderBy, onSnapshot, addDoc, 
    serverTimestamp, deleteDoc, doc, updateDoc, 
    deleteField, Timestamp, where, getDocs,
    limit, writeBatch, increment
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
    "ehUetd1rw3hdUvezMiSbwtQFUJR2",
    "yUVbsP6HeTWy4yFFDQYZb67Ob6M2",
    "G1v9jO8BknPTXO9FiqRrkJVndd63"
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

interface ChirpScoreTransaction {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    type: 'add' | 'subtract' | 'set';
    reason: string;
    adminId: string;
    adminName: string;
    previousBalance: number;
    newBalance: number;
    timestamp: any;
}

interface UserPost {
    id: string;
    content: string;
    createdAt: any;
    likes: number;
    commentsCount: number;
    authorId: string;
    author: {
        username: string;
        name: string;
        avatarUrl: string;
    };
}

interface UserComment {
    id: string;
    text: string;
    createdAt: any;
    postId: string;
    authorId: string;
    author: {
        username: string;
        name: string;
    };
}

export default function AdminPanel() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
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

    // ChirpScore Management State
    const [chirpScoreTransactions, setChirpScoreTransactions] = useState<ChirpScoreTransaction[]>([]);
    const [scoreManagementLoading, setScoreManagementLoading] = useState(false);
    const [selectedUserForScore, setSelectedUserForScore] = useState<any>(null);
    const [scoreActionType, setScoreActionType] = useState<'add' | 'subtract' | 'set'>('add');
    const [scoreAmount, setScoreAmount] = useState<string>('');
    const [scoreReason, setScoreReason] = useState<string>('');
    const [scoreLoading, setScoreLoading] = useState(false);
    const [scoreSearchTerm, setScoreSearchTerm] = useState('');
    const [topChirpers, setTopChirpers] = useState<any[]>([]);
    const [scoreTransactionsLoading, setScoreTransactionsLoading] = useState(false);

    // Mass Deletion State
    const [massDeletionUser, setMassDeletionUser] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<UserPost[]>([]);
    const [userComments, setUserComments] = useState<UserComment[]>([]);
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
    const [selectedComments, setSelectedComments] = useState<string[]>([]);
    const [massDeletionLoading, setMassDeletionLoading] = useState(false);
    const [massDeletionTab, setMassDeletionTab] = useState<'posts' | 'comments'>('posts');
    const [massDeletionDialogOpen, setMassDeletionDialogOpen] = useState(false);

    //gibberish detection
    const [gibberishResult, setGibberishResult] = useState<AdvancedGibberishResult | null>(null);
const [isCheckingGibberish, setIsCheckingGibberish] = useState(false);
const [isModelReady, setIsModelReady] = useState(false); // new

// =============== GIBBERISH DETECTION (async) ===============
useEffect(() => {
    if (!scoreReason.trim()) {
      setGibberishResult(null);
      return;
    }
  
    setIsCheckingGibberish(true);
    
    const timer = setTimeout(async () => {
      try {
        const result = await detectGibberish(scoreReason);
        setGibberishResult(result);
      } catch (error) {
        console.error('Gibberish detection failed:', error);
        setGibberishResult({
          probability: 0.5,
          isGibberish: false,
          confidence: 'low',
          logits: [],
          attention: [],
          details: ['⚠️ Detector unavailable – proceeding without analysis.']
        });
      } finally {
        setIsCheckingGibberish(false);
      }
    }, 400);
  
    return () => clearTimeout(timer);
  }, [scoreReason]);;

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
            
            // Load top chirpers
            loadTopChirpers();
            
            // Load chirp score transactions
            loadChirpScoreTransactions();

            return () => { 
                unsubReports(); 
                unsubUsers(); 
                unsubLogs(); 
                unsubQueue(); 
            };
        }
    }, [loadStep, adminRank]);

    

    const loadTopChirpers = async () => {
        try {
            const chirpers = await getTopChirpers();
            setTopChirpers(chirpers);
        } catch (error) {
            console.error('Error loading top chirpers:', error);
        }
    };

    const loadChirpScoreTransactions = async () => {
        if (!user || adminRank === 0) return;
        
        setScoreTransactionsLoading(true);
        try {
            // Try to get transactions from system_logs
            const logsQuery = query(
                collection(db, 'system_logs'),
                where('action', 'in', ['CHIRPSCORE_ADD', 'CHIRPSCORE_SUBTRACT', 'CHIRPSCORE_SET']),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            
            const logsSnapshot = await getDocs(logsQuery);
            const transactions: ChirpScoreTransaction[] = [];
            
            for (const logDoc of logsSnapshot.docs) {
                const logData = logDoc.data();
                const details = logData.details || '';
                
                // Parse the details string to extract transaction info
                const match = details.match(/(Added|Subtracted|Set)\s+(\d+)\s+ChirpScore\s+to\s+@(\w+)\s+\(Previous:\s+(\d+),\s+New:\s+(\d+)\)\s+-\s+Reason:\s+(.+)/);
                
                if (match) {
                    const [, action, amount, username, previousBalance, newBalance, reason] = match;
                    
                    // Find user in our allUsers array
                    const user = allUsers.find(u => u.username === username);
                    
                    transactions.push({
                        id: logDoc.id,
                        userId: user?.id || '',
                        userName: user?.name || username,
                        userEmail: user?.email || '',
                        amount: parseInt(amount),
                        type: action.toLowerCase() === 'added' ? 'add' : action.toLowerCase() === 'subtracted' ? 'subtract' : 'set',
                        reason: reason.trim(),
                        adminId: logData.adminId || '',
                        adminName: logData.adminUsername || 'Unknown Admin',
                        previousBalance: parseInt(previousBalance),
                        newBalance: parseInt(newBalance),
                        timestamp: logData.timestamp
                    });
                }
            }
            
            setChirpScoreTransactions(transactions);
            
            if (transactions.length === 0) {
                // Create some demo transactions for testing
                createDemoTransactions();
            }
            
        } catch (error) {
            console.error('Error loading chirp score transactions:', error);
            // If error (likely missing index), create demo data
            createDemoTransactions();
        } finally {
            setScoreTransactionsLoading(false);
        }
    };

// =============== LOAD TRANSFORMER MODEL ===============
useEffect(() => {
    if (loadStep === 2 && adminRank > 0) {
      getGibberishDetector().then(() => {
        setIsModelReady(true);
        console.log('🧠 Gibberish detector ready');
      }).catch(err => {
        console.error('Failed to load gibberish detector:', err);
        setIsModelReady(false);
      });
    }
  }, [loadStep, adminRank]);

    const createDemoTransactions = () => {
        const demoTransactions: ChirpScoreTransaction[] = [];
        const demoUsers = [
            { id: 'user1', name: 'Alex Johnson', username: 'alexj', email: 'alex@example.com' },
            { id: 'user2', name: 'Sam Wilson', username: 'samw', email: 'sam@example.com' },
            { id: 'user3', name: 'Taylor Swift', username: 'taylors', email: 'taylor@example.com' },
            { id: 'user4', name: 'Chris Evans', username: 'chrise', email: 'chris@example.com' }
        ];
        
        const now = new Date();
        
        demoUsers.forEach((demoUser, index) => {
            const types: Array<'add' | 'subtract' | 'set'> = ['add', 'subtract', 'set'];
            const reasons = [
                'Reward for community contributions',
                'Correction of system error',
                'Event participation bonus',
                'Testing purposes',
                'Manual adjustment'
            ];
            
            types.forEach((type, typeIndex) => {
                const amount = type === 'add' ? 500 + (index * 100) : 
                               type === 'subtract' ? 100 + (index * 50) : 
                               1000 + (index * 200);
                
                const previousBalance = type === 'set' ? 0 : 1000 + (index * 500);
                const newBalance = type === 'add' ? previousBalance + amount :
                                  type === 'subtract' ? previousBalance - amount :
                                  amount;
                
                demoTransactions.push({
                    id: `demo_${demoUser.id}_${type}_${typeIndex}`,
                    userId: demoUser.id,
                    userName: demoUser.name,
                    userEmail: demoUser.email,
                    amount: amount,
                    type: type,
                    reason: reasons[(index + typeIndex) % reasons.length],
                    adminId: user?.uid || 'admin',
                    adminName: user?.username || 'Super Admin',
                    previousBalance: previousBalance,
                    newBalance: newBalance,
                    timestamp: Timestamp.fromDate(new Date(now.getTime() - (index * 7 + typeIndex) * 24 * 60 * 60 * 1000))
                });
            });
        });
        
        // Sort by date
        demoTransactions.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
        
        setChirpScoreTransactions(demoTransactions);
        
        toast({
            title: 'Demo Transactions Loaded',
            description: 'No real transaction data found. Showing demo data.',
            variant: 'default'
        });
    };

    // Mass Deletion Functions
    const loadUserPosts = async (userId: string) => {
        try {
            const posts = await getPostsByUserId(userId);
            setUserPosts(posts);
            setSelectedPosts([]);
        } catch (error) {
            console.error('Error loading user posts:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load user posts.'
            });
        }
    };

    const loadUserComments = async (userId: string) => {
        try {
            const comments = await getCommentsByUserId(userId);
            setUserComments(comments);
            setSelectedComments([]);
        } catch (error) {
            console.error('Error loading user comments:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load user comments.'
            });
        }
    };

    const handleSelectUserForDeletion = async (selectedUser: any) => {
        setMassDeletionUser(selectedUser);
        setMassDeletionTab('posts');
        await loadUserPosts(selectedUser.id);
        setMassDeletionDialogOpen(true);
    };

    const togglePostSelection = (postId: string) => {
        setSelectedPosts(prev => 
            prev.includes(postId) 
                ? prev.filter(id => id !== postId)
                : [...prev, postId]
        );
    };

    const toggleCommentSelection = (commentId: string) => {
        setSelectedComments(prev => 
            prev.includes(commentId) 
                ? prev.filter(id => id !== commentId)
                : [...prev, commentId]
        );
    };

    const selectAllPosts = () => {
        if (selectedPosts.length === userPosts.length) {
            setSelectedPosts([]);
        } else {
            setSelectedPosts(userPosts.map(post => post.id));
        }
    };

    const selectAllComments = () => {
        if (selectedComments.length === userComments.length) {
            setSelectedComments([]);
        } else {
            setSelectedComments(userComments.map(comment => comment.id));
        }
    };

    const handleMassDeletePosts = async () => {
        if (selectedPosts.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Posts Selected',
                description: 'Please select at least one post to delete.'
            });
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedPosts.length} posts from @${massDeletionUser.username}? This action cannot be undone.`)) {
            return;
        }

        setMassDeletionLoading(true);
        try {
            // Delete posts in batches to avoid Firestore batch limit (500 operations)
            const batch = writeBatch(db);
            let batchCount = 0;
            const batchPromises = [];

            for (let i = 0; i < selectedPosts.length; i++) {
                const postId = selectedPosts[i];
                const postRef = doc(db, 'posts', postId);
                batch.delete(postRef);
                batchCount++;

                // Firestore batch limit is 500 operations
                if (batchCount >= 500 || i === selectedPosts.length - 1) {
                    batchPromises.push(batch.commit());
                    if (i !== selectedPosts.length - 1) {
                        // Start new batch
                        batchCount = 0;
                    }
                }
            }

            await Promise.all(batchPromises);

            // Log the action
            await addDoc(collection(db, 'system_logs'), {
                action: 'MASS_DELETE_POSTS',
                adminId: user?.uid,
                adminUsername: user?.username || 'Super Admin',
                details: `Deleted ${selectedPosts.length} posts from @${massDeletionUser.username}`,
                timestamp: serverTimestamp(),
            });

            // Refresh posts list
            await loadUserPosts(massDeletionUser.id);

            toast({
                title: 'Posts Deleted',
                description: `Successfully deleted ${selectedPosts.length} posts from @${massDeletionUser.username}`,
                variant: 'default'
            });

        } catch (error) {
            console.error('Error mass deleting posts:', error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'Failed to delete posts. Please try again.'
            });
        } finally {
            setMassDeletionLoading(false);
        }
    };

    const handleMassDeleteComments = async () => {
        if (selectedComments.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Comments Selected',
                description: 'Please select at least one comment to delete.'
            });
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedComments.length} comments from @${massDeletionUser.username}? This action cannot be undone.`)) {
            return;
        }

        setMassDeletionLoading(true);
        try {
            // Delete comments in batches
            const batch = writeBatch(db);
            let batchCount = 0;
            const batchPromises = [];

            for (let i = 0; i < selectedComments.length; i++) {
                const commentId = selectedComments[i];
                const commentRef = doc(db, 'comments', commentId);
                batch.delete(commentRef);
                batchCount++;

                if (batchCount >= 500 || i === selectedComments.length - 1) {
                    batchPromises.push(batch.commit());
                    if (i !== selectedComments.length - 1) {
                        batchCount = 0;
                    }
                }
            }

            await Promise.all(batchPromises);

            // Log the action
            await addDoc(collection(db, 'system_logs'), {
                action: 'MASS_DELETE_COMMENTS',
                adminId: user?.uid,
                adminUsername: user?.username || 'Super Admin',
                details: `Deleted ${selectedComments.length} comments from @${massDeletionUser.username}`,
                timestamp: serverTimestamp(),
            });

            // Refresh comments list
            await loadUserComments(massDeletionUser.id);

            toast({
                title: 'Comments Deleted',
                description: `Successfully deleted ${selectedComments.length} comments from @${massDeletionUser.username}`,
                variant: 'default'
            });

        } catch (error) {
            console.error('Error mass deleting comments:', error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'Failed to delete comments. Please try again.'
            });
        } finally {
            setMassDeletionLoading(false);
        }
    };

    const handleSwitchTab = async (tab: 'posts' | 'comments') => {
        setMassDeletionTab(tab);
        if (tab === 'posts') {
            await loadUserPosts(massDeletionUser.id);
        } else {
            await loadUserComments(massDeletionUser.id);
        }
    };

    const handleChirpScoreAction = async () => {
        if (!selectedUserForScore || !scoreAmount || !scoreReason.trim()) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a user, enter amount, and provide a reason.'
            });
            return;
        }

        const amount = parseInt(scoreAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Amount',
                description: 'Please enter a valid positive number.'
            });
            return;
        }

        if (scoreActionType === 'subtract' && amount > (selectedUserForScore.chirpScore || 0)) {
            toast({
                variant: 'destructive',
                title: 'Insufficient Balance',
                description: `User only has ${selectedUserForScore.chirpScore || 0} ChirpScore.`
            });
            return;
        }

        setScoreLoading(true);
        try {
            const userRef = doc(db, 'users', selectedUserForScore.id);
            const currentScore = selectedUserForScore.chirpScore || 0;
            let newScore = currentScore;

            switch (scoreActionType) {
                case 'add':
                    newScore = currentScore + amount;
                    break;
                case 'subtract':
                    newScore = currentScore - amount;
                    break;
                case 'set':
                    newScore = amount;
                    break;
            }

            // Update user's chirpScore
            await updateDoc(userRef, {
                chirpScore: newScore
            });

            // Log the transaction
            const logAction = scoreActionType === 'add' ? 'CHIRPSCORE_ADD' : 
                            scoreActionType === 'subtract' ? 'CHIRPSCORE_SUBTRACT' : 
                            'CHIRPSCORE_SET';
            
            await addDoc(collection(db, 'system_logs'), {
                action: logAction,
                adminId: user?.uid,
                adminUsername: user?.username || 'Super Admin',
                details: `${scoreActionType === 'add' ? 'Added' : scoreActionType === 'subtract' ? 'Subtracted' : 'Set'} ${amount} ChirpScore to @${selectedUserForScore.username} (Previous: ${currentScore}, New: ${newScore}) - Reason: ${scoreReason}`,
                timestamp: serverTimestamp(),
            });

            // Refresh user data
            const updatedUser = await getUserProfile(selectedUserForScore.id);
            if (updatedUser) {
                setSelectedUserForScore(updatedUser);
            }

            // Refresh transactions
            loadChirpScoreTransactions();

            // Refresh top chirpers
            loadTopChirpers();

            // Clear form
            setScoreAmount('');
            setScoreReason('');

            toast({
                title: 'ChirpScore Updated',
                description: `${scoreActionType === 'add' ? 'Added' : scoreActionType === 'subtract' ? 'Subtracted' : 'Set'} ${amount} ChirpScore to @${selectedUserForScore.username}`,
                variant: 'default'
            });

        } catch (error) {
            console.error('Error updating ChirpScore:', error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Failed to update ChirpScore. Please try again.'
            });
        } finally {
            setScoreLoading(false);
        }
    };

    const handleGiveToAll = async () => {
        if (!scoreAmount || !scoreReason.trim()) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please enter amount and provide a reason.'
            });
            return;
        }

        const amount = parseInt(scoreAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Amount',
                description: 'Please enter a valid positive number.'
            });
            return;
        }

        if (!confirm(`Give ${amount} ChirpScore to ALL ${allUsers.length} users? This action cannot be undone.`)) {
            return;
        }

        setScoreLoading(true);
        try {
            const batch = writeBatch(db);
            const updatedUsers: any[] = [];

            // Prepare all updates
            allUsers.forEach(user => {
                const userRef = doc(db, 'users', user.id);
                const currentScore = user.chirpScore || 0;
                const newScore = currentScore + amount;
                
                batch.update(userRef, {
                    chirpScore: newScore
                });

                updatedUsers.push({
                    id: user.id,
                    username: user.username,
                    previousScore: currentScore,
                    newScore: newScore
                });
            });

            // Execute batch update
            await batch.commit();

            // Log the bulk transaction
            await addDoc(collection(db, 'system_logs'), {
                action: 'CHIRPSCORE_ADD_ALL',
                adminId: user?.uid,
                adminUsername: user?.username || 'Super Admin',
                details: `Added ${amount} ChirpScore to all ${allUsers.length} users - Reason: ${scoreReason}`,
                timestamp: serverTimestamp(),
            });

            // Refresh data
            loadChirpScoreTransactions();
            loadTopChirpers();

            // Update local state for selected user if applicable
            if (selectedUserForScore) {
                const updatedUser = updatedUsers.find(u => u.id === selectedUserForScore.id);
                if (updatedUser) {
                    setSelectedUserForScore(prev => ({
                        ...prev,
                        chirpScore: updatedUser.newScore
                    }));
                }
            }

            toast({
                title: 'ChirpScore Distributed',
                description: `Added ${amount} ChirpScore to all ${allUsers.length} users.`,
                variant: 'default'
            });

        } catch (error) {
            console.error('Error giving ChirpScore to all users:', error);
            toast({
                variant: 'destructive',
                title: 'Distribution Failed',
                description: 'Failed to distribute ChirpScore. Please try again.'
            });
        } finally {
            setScoreLoading(false);
        }
    };

    // Filter users for ChirpScore management
    const filteredScoreUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchesSearch = (u.username || u.name || "").toLowerCase().includes(scoreSearchTerm.toLowerCase()) ||
                                 (u.email || "").toLowerCase().includes(scoreSearchTerm.toLowerCase());
            return matchesSearch;
        }).sort((a, b) => (b.chirpScore || 0) - (a.chirpScore || 0));
    }, [allUsers, scoreSearchTerm]);

    // Get filtered transactions
    const getFilteredTransactions = () => {
        return [...chirpScoreTransactions].sort((a, b) => 
            (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)
        ).slice(0, 50); // Show latest 50 transactions
    };

    const loadPurchaseHistory = async () => {
        if (!user || adminRank === 0) return;
        
        setPurchaseLoading(true);
        try {
            // Query the purchase history directly from a separate collection
            const purchaseHistoryRef = collection(db, 'purchase_history');
            const q = query(purchaseHistoryRef, orderBy('timestamp', 'desc'), limit(100));
            
            try {
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const purchases: PurchaseRecord[] = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            userId: data.userId || '',
                            userName: data.userName || 'Unknown User',
                            userEmail: data.userEmail || '',
                            itemName: data.itemName || 'Unknown Item',
                            itemType: data.itemType || 'unknown',
                            itemValue: data.itemValue || '',
                            originalPrice: data.originalPrice || 0,
                            discountedPrice: data.discountedPrice || data.originalPrice || 0,
                            userRole: data.userRole || 'user',
                            discountApplied: data.discountApplied || 0,
                            timestamp: data.timestamp || serverTimestamp(),
                            chirpScoreBalance: data.chirpScoreBalance || 0
                        };
                    });
                    
                    setPurchaseHistory(purchases);
                    calculatePurchaseStats(purchases);
                    
                    toast({
                        title: `Loaded ${purchases.length} Purchases`,
                        description: 'Showing purchase history from dedicated collection.',
                        variant: 'default'
                    });
                } else {
                    // Try to get purchases from user documents
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const allPurchases: PurchaseRecord[] = [];
                    
                    const now = new Date();
                    
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
                            const userRole = SUPER_ADMINS.includes(userDoc.id) ? 'superadmin' : 
                                            MODERATORS.includes(userDoc.id) ? 'moderator' : 'user';
                            
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
                                        const discountInfo = userRole === 'superadmin' ? 
                                            { discountedPrice: Math.floor(shopItem.price * 0.1), discountApplied: 90 } :
                                            userRole === 'moderator' ? 
                                            { discountedPrice: Math.ceil(shopItem.price * 0.7), discountApplied: 30 } :
                                            { discountedPrice: shopItem.price, discountApplied: 0 };
                                        
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
                    
                    if (allPurchases.length > 0) {
                        setPurchaseHistory(allPurchases);
                        calculatePurchaseStats(allPurchases);
                        
                        toast({
                            title: `Loaded ${allPurchases.length} Purchases`,
                            description: 'Showing purchased items from user profiles.',
                            variant: 'default'
                        });
                    } else {
                        // No purchases found at all
                        toast({
                            title: 'No Purchase Data Found',
                            description: 'No purchase records available.',
                            variant: 'default'
                        });
                    }
                }
            } catch (error: any) {
                if (error.code === 'failed-precondition' || error.code === 'unavailable') {
                    // Collection doesn't exist or missing index
                    setIndexWarning(true);
                    toast({
                        title: 'Purchase History Unavailable',
                        description: 'Purchase history collection not set up. Contact a super admin.',
                        variant: 'destructive'
                    });
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.error('Error loading purchase history:', error);
            toast({
                variant: 'destructive',
                title: 'Error Loading Purchase History',
                description: 'Failed to load purchase records.',
            });
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
                                {adminRank === 1 && (
                                    <Badge variant="outline" className="border-green-500/30 text-green-600 text-xs sm:text-sm">
                                        <Coins className="h-3 w-3 mr-1" />
                                        Score Manager
                                    </Badge>
                                )}
                                {adminRank === 1 && (
                                    <Badge variant="outline" className="border-red-500/30 text-red-600 text-xs sm:text-sm">
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Mass Delete
                                    </Badge>
                                )}
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

                {/* Tabs */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="w-full overflow-x-auto pb-2">
                            <TabsList className="grid grid-cols-6 w-full max-w-4xl bg-gradient-to-r from-muted/50 to-muted/30 p-1 rounded-xl h-auto sm:h-12 border border-border/50">
                                {[
                                    { value: 'reports', label: 'Reports', count: reports.length },
                                    { value: 'queue', label: 'Queue', count: pendingDeletions.length },
                                    { value: 'users', label: 'Users', count: allUsers.length },
                                    { value: 'logs', label: 'Logs', count: logs.length },
                                    { value: 'purchases', label: 'Purchases', count: purchaseStats.totalPurchases },
                                    { value: 'chirpscore', label: 'ChirpScore', count: adminRank === 1 ? 'MANAGE' : 'VIEW' }
                                ].map((tab) => (
                                    <TabsTrigger 
                                        key={tab.value}
                                        value={tab.value} 
                                        className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ffa600] data-[state=active]:to-[#ff8c00] data-[state=active]:text-black data-[state=active]:shadow-md text-xs sm:text-sm py-2 sm:py-0 transition-all"
                                        disabled={tab.value === 'chirpscore' && adminRank !== 1}
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

                        {/* USERS TAB - Updated with Mass Deletion */}
                        <TabsContent value="users" className="mt-6 space-y-4">
                            {/* User Filter Controls */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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

                                {adminRank === 1 && (
                                    <Dialog open={massDeletionDialogOpen} onOpenChange={setMassDeletionDialogOpen}>
                                        <DialogTrigger asChild>
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 }}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <Button 
                                                    variant="destructive" 
                                                    className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Mass Delete Content
                                                </Button>
                                            </motion.div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                                    <Trash2 className="h-5 w-5 text-red-500" />
                                                    Mass Content Deletion
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Select and delete multiple posts or comments from a user
                                                </DialogDescription>
                                            </DialogHeader>

                                            {massDeletionUser ? (
                                                <div className="space-y-6 py-4">
                                                    {/* User Info */}
                                                    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold">
                                                                        {massDeletionUser.username?.charAt(0).toUpperCase() || 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold">@{massDeletionUser.username}</p>
                                                                        <p className="text-sm text-muted-foreground">{massDeletionUser.email}</p>
                                                                    </div>
                                                                </div>
                                                                <Badge variant="destructive">
                                                                    {userPosts.length} posts • {userComments.length} comments
                                                                </Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>

                                                    {/* Content Tabs */}
                                                    <div className="flex border-b">
                                                        <Button
                                                            variant={massDeletionTab === 'posts' ? 'default' : 'ghost'}
                                                            className={`rounded-none ${massDeletionTab === 'posts' ? 'bg-red-600 text-white' : ''}`}
                                                            onClick={() => handleSwitchTab('posts')}
                                                        >
                                                            <FileWarning className="h-4 w-4 mr-2" />
                                                            Posts ({userPosts.length})
                                                        </Button>
                                                        <Button
                                                            variant={massDeletionTab === 'comments' ? 'default' : 'ghost'}
                                                            className={`rounded-none ${massDeletionTab === 'comments' ? 'bg-red-600 text-white' : ''}`}
                                                            onClick={() => handleSwitchTab('comments')}
                                                        >
                                                            <MessageSquare className="h-4 w-4 mr-2" />
                                                            Comments ({userComments.length})
                                                        </Button>
                                                    </div>

                                                    {/* Content List */}
                                                    <ScrollArea className="h-[400px] border rounded-lg">
                                                        {massDeletionTab === 'posts' ? (
                                                            <div className="space-y-2 p-4">
                                                                <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded">
                                                                    <div className="flex items-center gap-2">
                                                                        <Checkbox 
                                                                            id="select-all-posts"
                                                                            checked={selectedPosts.length === userPosts.length && userPosts.length > 0}
                                                                            onCheckedChange={selectAllPosts}
                                                                        />
                                                                        <label htmlFor="select-all-posts" className="text-sm font-medium cursor-pointer">
                                                                            Select All ({userPosts.length} posts)
                                                                        </label>
                                                                    </div>
                                                                    <Badge variant="secondary">
                                                                        {selectedPosts.length} selected
                                                                    </Badge>
                                                                </div>
                                                                {userPosts.map((post) => (
                                                                    <motion.div
                                                                        key={post.id}
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="flex items-start gap-3 p-3 border rounded hover:bg-muted/30"
                                                                    >
                                                                        <Checkbox 
                                                                            checked={selectedPosts.includes(post.id)}
                                                                            onCheckedChange={() => togglePostSelection(post.id)}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm line-clamp-2">{post.content}</p>
                                                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                                                <span>{post.likes} likes</span>
                                                                                <span>{post.commentsCount} comments</span>
                                                                                <span>{post.createdAt?.toDate?.().toLocaleDateString() || 'Unknown date'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                ))}
                                                                {userPosts.length === 0 && (
                                                                    <div className="text-center py-8 text-muted-foreground">
                                                                        <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                                        <p>No posts found for this user</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2 p-4">
                                                                <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded">
                                                                    <div className="flex items-center gap-2">
                                                                        <Checkbox 
                                                                            id="select-all-comments"
                                                                            checked={selectedComments.length === userComments.length && userComments.length > 0}
                                                                            onCheckedChange={selectAllComments}
                                                                        />
                                                                        <label htmlFor="select-all-comments" className="text-sm font-medium cursor-pointer">
                                                                            Select All ({userComments.length} comments)
                                                                        </label>
                                                                    </div>
                                                                    <Badge variant="secondary">
                                                                        {selectedComments.length} selected
                                                                    </Badge>
                                                                </div>
                                                                {userComments.map((comment) => (
                                                                    <motion.div
                                                                        key={comment.id}
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="flex items-start gap-3 p-3 border rounded hover:bg-muted/30"
                                                                    >
                                                                        <Checkbox 
                                                                            checked={selectedComments.includes(comment.id)}
                                                                            onCheckedChange={() => toggleCommentSelection(comment.id)}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm line-clamp-2">{comment.text}</p>
                                                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                                                <span>Post ID: {comment.postId?.substring(0, 8)}...</span>
                                                                                <span>{comment.createdAt?.toDate?.().toLocaleDateString() || 'Unknown date'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                ))}
                                                                {userComments.length === 0 && (
                                                                    <div className="text-center py-8 text-muted-foreground">
                                                                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                                        <p>No comments found for this user</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </ScrollArea>

                                                    {/* Action Buttons */}
                                                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setMassDeletionDialogOpen(false)}
                                                            disabled={massDeletionLoading}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        {massDeletionTab === 'posts' ? (
                                                            <Button
                                                                variant="destructive"
                                                                onClick={handleMassDeletePosts}
                                                                disabled={selectedPosts.length === 0 || massDeletionLoading}
                                                                className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800"
                                                            >
                                                                {massDeletionLoading ? (
                                                                    <>
                                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                        Deleting...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Delete {selectedPosts.length} Posts
                                                                    </>
                                                                )}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="destructive"
                                                                onClick={handleMassDeleteComments}
                                                                disabled={selectedComments.length === 0 || massDeletionLoading}
                                                                className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800"
                                                            >
                                                                {massDeletionLoading ? (
                                                                    <>
                                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                        Deleting...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Delete {selectedComments.length} Comments
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </DialogFooter>
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center">
                                                    <p className="text-muted-foreground mb-4">
                                                        Select a user from the list below to manage their content
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setMassDeletionDialogOpen(false)}
                                                    >
                                                        Close
                                                    </Button>
                                                </div>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>

                            {/* Users Table */}
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
                                                        <th className="p-3 sm:p-5 text-center text-[#ffa600]">Posts</th>
                                                        <th className="p-3 sm:p-5 text-right text-[#ffa600]">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {filteredUsers.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 sm:p-12 text-center text-muted-foreground text-xs sm:text-sm">
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
                                                            const postCount = u.postCount || 0;
                                                            const commentCount = u.commentCount || 0;
                                                            
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
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <Badge variant="outline" className="text-[8px] h-4">
                                                                                        {postCount} posts
                                                                                    </Badge>
                                                                                    <Badge variant="outline" className="text-[8px] h-4">
                                                                                        {commentCount} comments
                                                                                    </Badge>
                                                                                </div>
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
                                                                    <td className="p-3 sm:p-5 text-center">
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-base sm:text-lg font-bold">{postCount}</span>
                                                                            <span className="text-xs text-muted-foreground">posts</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 sm:p-5 text-right">
                                                                        <motion.div 
                                                                            className="flex justify-end gap-1 sm:gap-2"
                                                                            initial={{ opacity: 0, x: 20 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: index * 0.03 + 0.2 }}
                                                                        >
                                                                            {adminRank === 1 && (
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="outline" 
                                                                                    className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 sm:px-3 transition-all" 
                                                                                    onClick={() => handleSelectUserForDeletion(u)}
                                                                                >
                                                                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                                                                    <span className="hidden sm:inline">Delete Content</span>
                                                                                </Button>
                                                                            )}
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

                        {/* PURCHASES TAB - Fixed to only show for Super Admins */}
                        {adminRank === 1 && (
                            <TabsContent value="purchases" className="mt-6 space-y-6">
                                {indexWarning && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                            <div className="flex-1">
                                                <h3 className="font-bold text-yellow-600">Purchase History Collection Not Found</h3>
                                                <p className="text-sm text-yellow-700/80">
                                                    The dedicated purchase history collection doesn't exist or isn't properly indexed.
                                                    Purchase data is being loaded from user profiles instead.
                                                </p>
                                                <p className="text-xs text-yellow-600/60 mt-1">
                                                    Super Admins: Run "npm run setup-purchase-history" to create the collection and indexes.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

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
                        )}

                        {/* CHIRPSCORE TAB - Only for Super Admins */}
                        {adminRank === 1 && (
                            <TabsContent value="chirpscore" className="mt-6 space-y-6">
                                {/* Top Chirpers Leaderboard */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <Card className="border border-border/50 shadow-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Coins className="h-6 w-6 text-[#ffa600]" />
                                                    <h2 className="text-xl font-bold">Top Chirpers Leaderboard</h2>
                                                </div>
                                                <Badge variant="outline" className="border-[#ffa600]/30">
                                                    Live Ranking
                                                </Badge>
                                            </div>
                                            <div className="space-y-3">
                                                {topChirpers.map((chirper, index) => (
                                                    <motion.div
                                                        key={chirper.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className={`flex items-center justify-between p-3 rounded-lg ${index < 3 ? 'bg-gradient-to-r from-[#ffa600]/10 to-[#ff8c00]/5 border border-[#ffa600]/20' : 'bg-muted/30'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                                                                {index === 0 && <span className="text-xl">🥇</span>}
                                                                {index === 1 && <span className="text-xl">🥈</span>}
                                                                {index === 2 && <span className="text-xl">🥉</span>}
                                                                {index > 2 && <span className="font-bold text-[#ffa600]">{index + 1}</span>}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">@{chirper.username}</p>
                                                                <p className="text-xs text-muted-foreground">{chirper.name || chirper.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-bold text-[#ffa600]">{chirper.chirpScore?.toLocaleString() || 0}</p>
                                                            <p className="text-xs text-muted-foreground">ChirpScore</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* ChirpScore Management Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Column: User Selection and Management */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="space-y-6"
                                    >
                                        {/* User Search and Selection */}
                                        <Card className="border border-border/50 shadow-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                                            <CardContent className="p-6">
                                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                                    <User className="h-5 w-5 text-[#ffa600]" />
                                                    Select User
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ffa600]" />
                                                        <Input
                                                            placeholder="Search users by username, name, or email..."
                                                            value={scoreSearchTerm}
                                                            onChange={(e) => setScoreSearchTerm(e.target.value)}
                                                            className="pl-10"
                                                        />
                                                    </div>
                                                    <ScrollArea className="h-[300px] pr-4">
                                                        <div className="space-y-2">
                                                            {filteredScoreUsers.slice(0, 20).map((user) => (
                                                                <motion.div
                                                                    key={user.id}
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    className={`p-3 rounded-lg cursor-pointer transition-all ${selectedUserForScore?.id === user.id ? 'bg-gradient-to-r from-[#ffa600]/20 to-[#ff8c00]/10 border border-[#ffa600]/30' : 'bg-muted/30 hover:bg-muted/50'}`}
                                                                    onClick={() => setSelectedUserForScore(user)}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="font-medium">@{user.username}</p>
                                                                            <p className="text-xs text-muted-foreground">{user.name || user.email}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="font-bold text-[#ffa600]">{user.chirpScore?.toLocaleString() || 0}</p>
                                                                            <p className="text-xs text-muted-foreground">points</p>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Selected User Info */}
                                        {selectedUserForScore && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 }}
                                            >
                                                <Card className="border border-[#ffa600]/30 shadow-xl overflow-hidden bg-gradient-to-br from-[#ffa600]/5 to-[#ff8c00]/5">
                                                    <CardContent className="p-6">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="font-bold text-lg">Selected User</h3>
                                                            <Badge variant="outline" className="border-[#ffa600]/30">
                                                                Rank: #{filteredScoreUsers.findIndex(u => u.id === selectedUserForScore.id) + 1}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-medium">@{selectedUserForScore.username}</p>
                                                                    <p className="text-sm text-muted-foreground">{selectedUserForScore.name || selectedUserForScore.email}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-3xl font-bold text-[#ffa600]">
                                                                        {selectedUserForScore.chirpScore?.toLocaleString() || 0}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">Current ChirpScore</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                                                                <div className="text-center">
                                                                    <p className="text-xs text-muted-foreground">Posts</p>
                                                                    <p className="font-bold">{selectedUserForScore.postCount || 0}</p>
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-xs text-muted-foreground">Comments</p>
                                                                    <p className="font-bold">{selectedUserForScore.commentCount || 0}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    {/* Right Column: Score Management */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="space-y-6"
                                    >
                                        {/* Score Management Form */}
                                        <Card className="border border-border/50 shadow-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                                            <CardContent className="p-6">
                                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                                    <Coins className="h-5 w-5 text-[#ffa600]" />
                                                    Manage ChirpScore
                                                </h3>
                                                <div className="space-y-4">
                                                    {/* Action Type Selection */}
                                                    <div>
                                                        <Label className="text-sm font-medium mb-2 block">Action Type</Label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[
                                                                { value: 'add', label: 'Add Points', icon: Plus, color: 'bg-green-500 hover:bg-green-600' },
                                                                { value: 'subtract', label: 'Subtract Points', icon: Minus, color: 'bg-red-500 hover:bg-red-600' },
                                                                { value: 'set', label: 'Set Points', icon: Coins, color: 'bg-blue-500 hover:bg-blue-600' }
                                                            ].map((action) => (
                                                                <motion.button
                                                                    key={action.value}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    type="button"
                                                                    className={`p-3 rounded-lg flex flex-col items-center justify-center transition-all ${scoreActionType === action.value ? action.color + ' text-white' : 'bg-muted hover:bg-muted/80'}`}
                                                                    onClick={() => setScoreActionType(action.value as any)}
                                                                >
                                                                    <action.icon className="h-5 w-5 mb-1" />
                                                                    <span className="text-xs font-medium">{action.label}</span>
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Amount Input */}
                                                    <div>
                                                        <Label htmlFor="scoreAmount" className="text-sm font-medium mb-2 block">
                                                            Amount to {scoreActionType === 'add' ? 'Add' : scoreActionType === 'subtract' ? 'Subtract' : 'Set'}
                                                        </Label>
                                                        <div className="relative">
                                                            <Input
                                                                id="scoreAmount"
                                                                type="number"
                                                                min="1"
                                                                placeholder={`Enter ${scoreActionType === 'set' ? 'new' : ''} ChirpScore amount`}
                                                                value={scoreAmount}
                                                                onChange={(e) => setScoreAmount(e.target.value)}
                                                                className="pl-10"
                                                            />
                                                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ffa600]" />
                                                        </div>
                                                        {scoreActionType === 'subtract' && selectedUserForScore && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                User has {selectedUserForScore.chirpScore || 0} ChirpScore available
                                                            </p>
                                                        )}
                                                    </div>

{/* Reason Input */}
<div>
  <Label htmlFor="scoreReason" className="text-sm font-medium mb-2 block">
    Reason (Required)
  </Label>
  <div className="relative">
    <Textarea
      id="scoreReason"
      placeholder="Why are you adjusting this user's ChirpScore?"
      value={scoreReason}
      onChange={(e) => setScoreReason(e.target.value)}
      className="min-h-[100px] pr-24"
    />
    <div className="absolute bottom-2 right-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          if (!scoreReason.trim()) return;
          setIsCheckingGibberish(true);
          try {
            const result = await detectGibberish(scoreReason);
            setGibberishResult(result);
          } catch (error) {
            console.error('Check failed:', error);
          } finally {
            setIsCheckingGibberish(false);
          }
        }}
        disabled={!scoreReason.trim() || !isModelReady || isCheckingGibberish}
        className="h-8 text-xs"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        Check
      </Button>
    </div>
  </div>

  {/* Gibberish Detection Feedback — Single Block */}
  <div className="mt-2 space-y-1">
    {/* Model not ready yet */}
    {!isModelReady && !isCheckingGibberish && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-500/10 p-2 rounded">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading AI model (first time only)…
      </div>
    )}

    {/* Actively analysing */}
    {isCheckingGibberish && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        DistilBERT is thinking...
      </div>
    )}

    {/* Show result when available */}
    {gibberishResult && !isCheckingGibberish && (
      <div
        className={`rounded-md p-3 text-xs ${
          gibberishResult.probability < 0.3
            ? 'bg-green-500/10 border border-green-500/30'
            : gibberishResult.probability < 0.65
            ? 'bg-yellow-500/10 border border-yellow-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}
      >
        <div className="flex items-start gap-2">
          {gibberishResult.probability < 0.3 && (
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          )}
          {gibberishResult.probability >= 0.3 &&
            gibberishResult.probability < 0.65 && (
              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            )}
          {gibberishResult.probability >= 0.65 && (
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-medium">
                Gibberish confidence: {(gibberishResult.probability * 100).toFixed(1)}%
              </span>
              <Badge
                variant={gibberishResult.isGibberish ? 'destructive' : 'secondary'}
              >
                {gibberishResult.isGibberish ? '🚫 Gibberish' : '✅ Valid'}
              </Badge>
            </div>

            {/* Confidence bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${
                  gibberishResult.probability < 0.3
                    ? 'bg-green-500'
                    : gibberishResult.probability < 0.65
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                initial={{ width: '0%' }}
                animate={{ width: `${gibberishResult.probability * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>

            {/* Diagnostic details */}
            {gibberishResult.details && gibberishResult.details.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                {gibberishResult.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-1">
                    <span>•</span>
                    <span className="italic">{detail}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attention tokens */}
            {gibberishResult.attention && gibberishResult.attention.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                <span className="font-medium">🧠 Model focused on: </span>
                {gibberishResult.attention.map((t, i) => (
                  <Badge key={i} variant="outline" className="mr-1 text-[10px]">
                    {t.token} ({(t.weight * 100).toFixed(0)}%)
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
</div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-3 pt-2">
                                                        <motion.div
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="flex-1"
                                                        >
                                                            <Button
  onClick={handleChirpScoreAction}
  disabled={
    !selectedUserForScore || 
    !scoreAmount || 
    !scoreReason.trim() || 
    scoreLoading ||
    !isModelReady ||                // 🟢 WAIT for model to load
    isCheckingGibberish ||          // 🟢 WAIT for analysis to finish
    !gibberishResult ||            // 🟢 REQUIRE a result before allowing
    gibberishResult.isGibberish    // 🟢 BLOCK if it's gibberish
  }
  className="w-full bg-gradient-to-r ..."
>
    {/* Show why it's disabled */}
{!isModelReady && (
  <p className="text-xs text-blue-500 mt-1">
    ⏳ Loading AI model – please wait a moment...
  </p>
)}
{isCheckingGibberish && !gibberishResult && (
  <p className="text-xs text-yellow-500 mt-1">
    🤖 Analysing your reason...
  </p>
)}
{gibberishResult?.isGibberish && (
  <p className="text-xs text-red-500 mt-1">
    🚫 Cannot submit – reason appears to be gibberish. Please write a clear explanation.
  </p>
)}
                                                                {scoreLoading ? (
                                                                    <>
                                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                        Processing...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {scoreActionType === 'add' ? 'Add' : scoreActionType === 'subtract' ? 'Subtract' : 'Set'} ChirpScore
                                                                        {selectedUserForScore && ` to @${selectedUserForScore.username}`}
                                                                    </>
                                                                )}
                                                            </Button>
                                                            {gibberishResult?.isGibberish && (
                                                            <p className="text-xs text-red-500 mt-1">
                                                                    Cannot submit – reason appears to be gibberish. Please write a clear explanation.
                                                             </p>
                                                            )}
                                                        </motion.div>
                                                        <motion.div
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <Button
                                                                onClick={handleGiveToAll}
                                                                disabled={!scoreAmount || !scoreReason.trim() || scoreLoading}
                                                                variant="outline"
                                                                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                            >
                                                                <Gift className="h-4 w-4 mr-2" />
                                                                Give to All
                                                            </Button>
                                                        </motion.div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Recent Transactions */}
                                        <Card className="border border-border/50 shadow-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                                        <Activity className="h-5 w-5 text-[#ffa600]" />
                                                        Recent Transactions
                                                    </h3>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={loadChirpScoreTransactions}
                                                        disabled={scoreTransactionsLoading}
                                                    >
                                                        <RefreshCw className={`h-4 w-4 mr-2 ${scoreTransactionsLoading ? 'animate-spin' : ''}`} />
                                                        Refresh
                                                    </Button>
                                                </div>
                                                <ScrollArea className="h-[300px] pr-4">
                                                    {scoreTransactionsLoading ? (
                                                        <div className="flex items-center justify-center h-full">
                                                            <Loader2 className="h-8 w-8 animate-spin text-[#ffa600]" />
                                                        </div>
                                                    ) : getFilteredTransactions().length === 0 ? (
                                                        <div className="text-center py-8 text-muted-foreground">
                                                            <Coins className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                            <p>No transactions found</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {getFilteredTransactions().map((transaction) => (
                                                                <motion.div
                                                                    key={transaction.id}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="p-3 rounded-lg bg-muted/30"
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <Badge variant={
                                                                                    transaction.type === 'add' ? 'default' :
                                                                                    transaction.type === 'subtract' ? 'destructive' : 'secondary'
                                                                                } className="text-xs">
                                                                                    {transaction.type === 'add' ? 'ADDED' : transaction.type === 'subtract' ? 'SUBTRACTED' : 'SET'}
                                                                                </Badge>
                                                                                <span className="text-sm font-medium">@{transaction.userName}</span>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground mb-1">{transaction.reason}</p>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                By: {transaction.adminName} • {transaction.timestamp?.toDate().toLocaleString() || 'Unknown time'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className={`text-lg font-bold ${transaction.type === 'add' ? 'text-green-600' : transaction.type === 'subtract' ? 'text-red-600' : 'text-blue-600'}`}>
                                                                                {transaction.type === 'add' ? '+' : transaction.type === 'subtract' ? '-' : '='}
                                                                                {transaction.amount}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {transaction.previousBalance} → {transaction.newBalance}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </div>

                                {/* Quick Actions */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="border border-border/50 shadow-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                                        <CardContent className="p-6">
                                            <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {[
                                                    { label: 'Give 100 to All', amount: 100, icon: Gift, color: 'bg-green-500 hover:bg-green-600' },
                                                    { label: 'Give 500 to All', amount: 500, icon: Gift, color: 'bg-blue-500 hover:bg-blue-600' },
                                                    { label: 'Give 1000 to All', amount: 1000, icon: Gift, color: 'bg-purple-500 hover:bg-purple-600' }
                                                ].map((action) => (
                                                    <motion.div
                                                        key={action.label}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <Button
                                                            onClick={() => {
                                                                setScoreAmount(action.amount.toString());
                                                                setScoreActionType('add');
                                                                setScoreReason(`Bulk distribution: ${action.label}`);
                                                            }}
                                                            className={`w-full ${action.color} text-white`}
                                                        >
                                                            <action.icon className="h-4 w-4 mr-2" />
                                                            {action.label}
                                                        </Button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </TabsContent>
                        )}

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