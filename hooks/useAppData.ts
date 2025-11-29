
import { useState, useEffect, useCallback } from 'react';
import { db, firebase, auth } from '../firebase';
import {
    Client, PreBudget, Routes, Product, Order, Settings, ClientProduct, UserData,
    OrderStatus, AppData, ReplenishmentQuote, ReplenishmentQuoteStatus
} from '../types';

const defaultSettings: Settings = {
    companyName: "AquaManager Pro",
    mainTitle: "AquaManager Pro",
    mainSubtitle: "Sua solução completa para gerenciamento de piscinas.",
    baseAddress: {
        street: "Rua Principal",
        number: "123",
        neighborhood: "Centro",
        city: "Sua Cidade",
        state: "SP",
        zip: "12345-000",
    },
    pixKey: "seu-pix@email.com",
    pricing: {
        perKm: 1.5,
        wellWaterFee: 50,
        productsFee: 75,
        vipDiscountPercent: 10,
        volumeTiers: [
            { upTo: 20000, price: 150 },
            { upTo: 50000, price: 250 },
            { upTo: 100000, price: 400 },
        ],
    },
    plans: {
        simple: { title: "Plano Simples", benefits: ["Limpeza semanal", "Ajuste de pH e Cloro"] },
        vip: { title: "Plano VIP", benefits: ["Tudo do Simples", "Produtos inclusos", "Atendimento prioritário"] },
    },
    features: {
        vipPlanEnabled: true,
        storeEnabled: true,
        advancePaymentPlanEnabled: false,
    },
    automation: {
        replenishmentStockThreshold: 2,
    }
};


export const useAppData = (user: any | null, userData: UserData | null): AppData => {
    const [clients, setClients] = useState<Client[]>([]);
    const [preBudgets, setPreBudgets] = useState<PreBudget[]>([]);
    const [routes, setRoutes] = useState<Routes>({});
    const [unscheduledClients, setUnscheduledClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [replenishmentQuotes, setReplenishmentQuotes] = useState<ReplenishmentQuote[]>([]);
    const [setupCheck, setSetupCheck] = useState<'checking' | 'needed' | 'done'>('checking');


    const [loading, setLoading] = useState({
        clients: true, preBudgets: true, routes: true, products: true, orders: true, settings: true, replenishmentQuotes: true
    });

    const isUserAdmin = userData?.role === 'admin';

    // Generic function to set loading state
    const setLoadingState = <K extends keyof typeof loading>(key: K, value: boolean) => {
        setLoading(prev => ({ ...prev, [key]: value }));
    };
    
    // Initial Setup Check (runs once for everyone)
    useEffect(() => {
        const checkAdminExists = async () => {
            try {
                const adminQuery = await db.collection('users').where('role', '==', 'admin').limit(1).get();
                setSetupCheck(adminQuery.empty ? 'needed' : 'done');
            } catch (error) {
                console.error("Error checking for admin user:", error);
                setSetupCheck('done'); // Fallback to avoid getting stuck in a setup loop on error
            }
        };
        checkAdminExists();
    }, []);

    // Replenishment Automation
    useEffect(() => {
        // Run only once per session for admin
        const hasRunKey = `replenishmentCheck_${new Date().toISOString().split('T')[0]}`;
        if (!isUserAdmin || sessionStorage.getItem(hasRunKey) || !settings || clients.length === 0 || products.length === 0) {
            return;
        }

        const runReplenishmentCheck = async () => {
            console.log("Running replenishment check...");
            const threshold = settings.automation.replenishmentStockThreshold;
            const activeClients = clients.filter(c => c.clientStatus === 'Ativo');
            const pendingQuotesClientIds = new Set(replenishmentQuotes.filter(q => q.status === 'suggested' || q.status === 'sent').map(q => q.clientId));

            for (const client of activeClients) {
                if (pendingQuotesClientIds.has(client.id)) continue;

                const lowStockItems = client.stock.filter(item => item.quantity <= threshold);
                if (lowStockItems.length === 0) continue;
                
                const itemsToReplenish: any[] = [];
                let total = 0;

                for (const lowItem of lowStockItems) {
                    const productInfo = products.find(p => p.id === lowItem.productId);
                    // Only add products that are still sold and in stock
                    if (productInfo && productInfo.stock > 0) {
                        const quantityToSuggest = 5; // Suggest a default quantity
                        itemsToReplenish.push({ ...productInfo, quantity: quantityToSuggest });
                        total += productInfo.price * quantityToSuggest;
                    }
                }

                if (itemsToReplenish.length > 0) {
                    const newQuote: Omit<ReplenishmentQuote, 'id'> = {
                        clientId: client.id,
                        clientName: client.name,
                        items: itemsToReplenish,
                        total,
                        status: 'suggested',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    };
                    await db.collection('replenishmentQuotes').add(newQuote);
                    console.log(`Generated replenishment quote for ${client.name}`);
                }
            }
            sessionStorage.setItem(hasRunKey, 'true');
        };

        // Delay slightly to ensure all data is loaded
        const timer = setTimeout(runReplenishmentCheck, 5000);
        return () => clearTimeout(timer);

    }, [isUserAdmin, settings, clients, products, replenishmentQuotes]);

    useEffect(() => {
        if (!isUserAdmin) return;
        const unsubClients = db.collection('clients').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
            setClients(data);
            setLoadingState('clients', false);
        });
        const unsubBudgets = db.collection('pre-budgets').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreBudget));
            setPreBudgets(data);
            setLoadingState('preBudgets', false);
        });
        const unsubRoutes = db.collection('routes').doc('main').onSnapshot(doc => {
            if (doc.exists) {
                setRoutes(doc.data() as Routes);
            }
            setLoadingState('routes', false);
        });
        const unsubOrders = db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setOrders(data);
            setLoadingState('orders', false);
        });
        const unsubQuotes = db.collection('replenishmentQuotes').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplenishmentQuote));
            setReplenishmentQuotes(data);
            setLoadingState('replenishmentQuotes', false);
        });

        return () => { unsubClients(); unsubBudgets(); unsubRoutes(); unsubOrders(); unsubQuotes(); };
    }, [isUserAdmin]);
    
    // Unscheduled Clients Logic
    useEffect(() => {
        if (!isUserAdmin) return;
        
        const scheduledClientIds = new Set();
        Object.keys(routes).forEach(dayKey => {
            routes[dayKey]?.clients.forEach(client => scheduledClientIds.add(client.id));
        });
        
        const unscheduled = clients.filter(client => !scheduledClientIds.has(client.id));
        setUnscheduledClients(unscheduled);

    }, [clients, routes, isUserAdmin]);

    // Products and Settings listeners (publicly available)
    useEffect(() => {
        if(setupCheck !== 'done') return;

        const unsubProducts = db.collection('products').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(data);
            setLoadingState('products', false);
        });
        const unsubSettings = db.collection('settings').doc('main').onSnapshot(doc => {
            if (doc.exists) {
                const settingsData = doc.data() as Settings;
                // Merge with defaults to prevent errors if new settings are added
                setSettings({ ...defaultSettings, ...settingsData });
            } else {
                setSettings(defaultSettings);
            }
             setLoadingState('settings', false);
        });

        return () => { unsubProducts(); unsubSettings(); };
    }, [setupCheck]);

     // Client-specific data fetching
    useEffect(() => {
        if (userData?.role !== 'client' || !user) return;

        const unsubOrders = db.collection('orders').where('clientId', '==', user.uid).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setOrders(data);
            setLoadingState('orders', false);
        });

        const unsubQuotes = db.collection('replenishmentQuotes').where('clientId', '==', user.uid).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplenishmentQuote));
            setReplenishmentQuotes(data);
            setLoadingState('replenishmentQuotes', false);
        });

        return () => { unsubOrders(); unsubQuotes(); };
    }, [user, userData]);

    const createInitialAdmin = async (name: string, email: string, pass: string) => {
        const adminQuery = await db.collection('users').where('role', '==', 'admin').limit(1).get();
        if (!adminQuery.empty) {
            throw new Error("Um administrador já existe. A criação foi cancelada.");
        }
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
            const newUid = userCredential.user.uid;
            await db.collection('users').doc(newUid).set({
                name,
                email,
                role: 'admin',
                uid: newUid,
            });
            // State update will trigger useAuth to log in the new user automatically
            setSetupCheck('done');
        } catch (error: any) {
            console.error("Error creating initial admin:", error);
            if (error.code === 'auth/email-already-in-use') {
                throw new Error("Este email já existe na autenticação, mas não como admin. Por favor, remova-o no painel do Firebase e tente novamente.");
            }
            throw new Error("Falha ao criar administrador: " + error.message);
        }
    };

    const approveBudget = async (budgetId: string) => {
        const budgetDoc = await db.collection('pre-budgets').doc(budgetId).get();
        if (!budgetDoc.exists) throw new Error("Orçamento não encontrado.");

        const budget = budgetDoc.data() as PreBudget;

        const defaultPassword = "password123";
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(budget.email, defaultPassword);
            const newUid = userCredential.user.uid;

            const batch = db.batch();

            const userDocRef = db.collection('users').doc(newUid);
            batch.set(userDocRef, { name: budget.name, email: budget.email, role: 'client', uid: newUid });

            const clientDocRef = db.collection('clients').doc();
            const newClient: Omit<Client, 'id'> = {
                uid: newUid,
                name: budget.name,
                email: budget.email,
                phone: budget.phone,
                address: budget.address,
                poolDimensions: budget.poolDimensions,
                poolVolume: budget.poolVolume,
                hasWellWater: budget.hasWellWater,
                includeProducts: budget.includeProducts,
                plan: budget.plan,
                clientStatus: 'Ativo',
                poolStatus: { ph: 7.2, cloro: 1.5, alcalinidade: 100, uso: 'Livre para uso' },
                payment: {
                    status: 'Pendente',
                    dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                    monthlyFee: budget.monthlyFee
                },
                stock: [],
                pixKey: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            };
            batch.set(clientDocRef, newClient);

            const budgetRef = db.collection('pre-budgets').doc(budgetId);
            batch.update(budgetRef, { status: 'approved' });
            
            await batch.commit();

        } catch (error: any) {
            console.error("Erro ao aprovar orçamento de novo cliente:", error);
            if (error.code === 'auth/email-already-in-use') {
                 await db.collection('pre-budgets').doc(budgetId).update({ status: 'rejected' });
                 throw new Error("Este email já está em uso. Orçamento recusado.");
            }
            throw error;
        }
    };
    
    const rejectBudget = (budgetId: string) => db.collection('pre-budgets').doc(budgetId).update({ status: 'rejected' });
    const updateClient = (clientId: string, data: Partial<Client>) => db.collection('clients').doc(clientId).update(data);
    const deleteClient = (clientId: string) => db.collection('clients').doc(clientId).delete();

    const markAsPaid = async (client: Client) => {
        const nextDueDate = new Date(client.payment.dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        await updateClient(client.id, {
            payment: {
                ...client.payment,
                status: 'Pago',
                dueDate: nextDueDate.toISOString(),
            }
        });
    };
    
    const updateClientStock = (clientId: string, stock: ClientProduct[]) => updateClient(clientId, { stock });

    const scheduleClient = async (clientId: string, dayKey: string) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;
        await db.collection('routes').doc('main').set({
            [dayKey]: {
                clients: firebase.firestore.FieldValue.arrayUnion(client)
            }
        }, { merge: true });
    };

    const unscheduleClient = async (clientId: string, dayKey: string) => {
        const routeDay = routes[dayKey];
        if(!routeDay) return;
        const client = routeDay.clients.find(c => c.id === clientId);
        if (!client) return;
        await db.collection('routes').doc('main').update({
            [`${dayKey}.clients`]: firebase.firestore.FieldValue.arrayRemove(client)
        });
    };

    const toggleRouteStatus = (dayKey: string, status: boolean) => {
        return db.collection('routes').doc('main').update({
            [`${dayKey}.isRouteActive`]: status
        });
    };

    const saveProduct = (product: Omit<Product, 'id'> | Product) => {
        if ('id' in product) {
            return db.collection('products').doc(product.id).update(product);
        }
        return db.collection('products').add(product);
    };

    const deleteProduct = (productId: string) => db.collection('products').doc(productId).delete();
    const updateOrderStatus = (orderId: string, status: OrderStatus) => db.collection('orders').doc(orderId).update({ status });
    const updateSettings = (newSettings: Partial<Settings>) => db.collection('settings').doc('main').set(newSettings, { merge: true });
    
    const createPreBudget = (budgetData: Omit<PreBudget, 'id' | 'status' | 'createdAt'>) => {
        const budget: Omit<PreBudget, 'id'> = {
            ...budgetData,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return db.collection('pre-budgets').add(budget);
    };

    const createOrder = (orderData: Omit<Order, 'id' | 'createdAt'>) => {
        const order: Omit<Order, 'id'> = {
            ...orderData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return db.collection('orders').add(order);
    };

    const updateReplenishmentQuoteStatus = async (quoteId: string, status: ReplenishmentQuoteStatus) => {
        await db.collection('replenishmentQuotes').doc(quoteId).update({
            status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    const getClientData = useCallback(async (): Promise<Client | null> => {
        if (userData?.role !== 'client' || !user) return null;
        setLoadingState('clients', true);
        try {
            const querySnapshot = await db.collection('clients').where('uid', '==', user.uid).limit(1).get();
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const clientData = { id: doc.id, ...doc.data() } as Client;
                setClients([clientData]);
                return clientData;
            }
            return null;
        } catch (error) {
            console.error("Error fetching client data:", error);
            return null;
        } finally {
            setLoadingState('clients', false);
        }
    }, [user, userData]);

    const resetAllData = async () => {
        if (!window.confirm("Você tem certeza que deseja resetar TODOS os dados? Esta ação é irreversível e irá apagar clientes, orçamentos, pedidos, produtos e rotas.")) {
            return;
        }

        try {
            const collectionsToDelete = ['clients', 'pre-budgets', 'orders', 'products', 'replenishmentQuotes'];
            for (const collectionName of collectionsToDelete) {
                const snapshot = await db.collection(collectionName).get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }

            // Reset routes
            await db.collection('routes').doc('main').set({});
            
            alert('Todos os dados foram resetados com sucesso.');
        } catch (error) {
            console.error("Erro ao resetar os dados:", error);
            alert('Ocorreu um erro ao resetar os dados.');
        }
    };


    return {
        clients, preBudgets, routes, unscheduledClients, products, orders, settings, replenishmentQuotes, loading,
        setupCheck, createInitialAdmin,
        approveBudget, rejectBudget, updateClient, deleteClient, markAsPaid, updateClientStock,
        scheduleClient, unscheduleClient, toggleRouteStatus, saveProduct, deleteProduct,
        updateOrderStatus, updateSettings, createPreBudget, createOrder, getClientData,
        updateReplenishmentQuoteStatus,
        resetAllData,
    };
};