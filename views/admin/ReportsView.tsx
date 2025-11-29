
import React, { useMemo, useEffect, useRef } from 'react';
import { AppContextType, Client } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { UsersIcon, CurrencyDollarIcon, CheckBadgeIcon, StoreIcon, TrashIcon } from '../../constants';
import { Button } from '../../components/Button';

// This is a workaround for the no-build-tool environment
declare const Chart: any;

interface ReportsViewProps {
    appContext: AppContextType;
}

const ReportsView: React.FC<ReportsViewProps> = ({ appContext }) => {
    const { clients, orders, preBudgets, products, loading, resetReportsData } = appContext;

    const stats = useMemo(() => {
        const activeClients = clients.filter(c => c.clientStatus === 'Ativo');
        const monthlyRevenue = activeClients.reduce((sum, client) => sum + client.payment.monthlyFee, 0);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const newBudgetsThisMonth = preBudgets.filter(b => b.createdAt?.toDate() >= startOfMonth).length;
        const ordersThisMonth = orders.filter(o => o.createdAt?.toDate() >= startOfMonth).length;
        
        return {
            activeClients: activeClients.length,
            monthlyRevenue,
            newBudgetsThisMonth,
            ordersThisMonth
        };
    }, [clients, orders, preBudgets]);

    const topSellingProducts = useMemo(() => {
        const productCount: { [key: string]: number } = {};
        orders.flatMap(o => o.items).forEach(item => {
            productCount[item.id] = (productCount[item.id] || 0) + item.quantity;
        });

        return Object.entries(productCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([productId, quantity]) => {
                const product = products.find(p => p.id === productId);
                return { name: product?.name || 'Produto desconhecido', quantity };
            });
    }, [orders, products]);
    
    const pendingPayments = useMemo(() => {
        return clients.filter(c => c.payment.status === 'Pendente' || c.payment.status === 'Atrasado')
            .sort((a, b) => new Date(a.payment.dueDate).getTime() - new Date(b.payment.dueDate).getTime());
    }, [clients]);

    const isLoading = loading.clients || loading.orders || loading.preBudgets || loading.products;
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Relatórios e Insights</h2>
                <Button variant="danger" size="sm" onClick={resetReportsData}>
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Resetar Dados
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KpiCard title="Clientes Ativos" value={stats.activeClients} icon={UsersIcon} />
                <KpiCard title="Faturamento Mensal" value={`R$ ${stats.monthlyRevenue.toFixed(2)}`} icon={CurrencyDollarIcon} />
                <KpiCard title="Novos Orçamentos (Mês)" value={stats.newBudgetsThisMonth} icon={CheckBadgeIcon} />
                <KpiCard title="Pedidos na Loja (Mês)" value={stats.ordersThisMonth} icon={StoreIcon} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                <Card className="lg:col-span-2">
                    <CardHeader><h3 className="font-semibold">Distribuição de Planos</h3></CardHeader>
                    <CardContent>
                        <ClientPlanChart clients={clients} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader><h3 className="font-semibold">Crescimento (Últimos 6 Meses)</h3></CardHeader>
                    <CardContent>
                        <MonthlyGrowthChart clients={clients} />
                    </CardContent>
                </Card>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><h3 className="font-semibold">Produtos Mais Vendidos</h3></CardHeader>
                    <CardContent>
                        <DataTable headers={['Produto', 'Quantidade Vendida']} data={topSellingProducts.map(p => [p.name, p.quantity])} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><h3 className="font-semibold">Pagamentos Pendentes</h3></CardHeader>
                    <CardContent>
                       <DataTable headers={['Cliente', 'Vencimento', 'Valor']} data={pendingPayments.map(c => [c.name, new Date(c.payment.dueDate).toLocaleDateString(), `R$ ${c.payment.monthlyFee.toFixed(2)}`])} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.FC<any> }) => (
    <Card>
        <CardContent className="flex items-center">
            <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-full mr-4">
                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-300" />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </CardContent>
    </Card>
);

const DataTable = ({ headers, data }: { headers: string[], data: (string | number)[][] }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
            <thead className="border-b dark:border-gray-700">
                <tr>
                    {headers.map(h => <th key={h} className="text-left p-2 font-semibold">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.length > 0 ? data.map((row, i) => (
                    <tr key={i} className="border-b dark:border-gray-700">
                        {row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}
                    </tr>
                )) : <tr><td colSpan={headers.length} className="text-center p-4 text-gray-500">Nenhum dado disponível.</td></tr>}
            </tbody>
        </table>
    </div>
);


const ClientPlanChart = ({ clients }: { clients: Client[] }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const data = useMemo(() => {
        const counts = clients.reduce((acc, client) => {
            if (client.clientStatus === 'Ativo') {
                acc[client.plan] = (acc[client.plan] || 0) + 1;
            }
            return acc;
        }, {} as { [key: string]: number });
        return {
            labels: Object.keys(counts),
            values: Object.values(counts)
        };
    }, [clients]);

    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        const ctx = chartRef.current.getContext('2d');
        chartInstance.current = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: ['#3b82f6', '#f59e0b'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    return <canvas ref={chartRef}></canvas>;
};

const MonthlyGrowthChart = ({ clients }: { clients: Client[] }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const data = useMemo(() => {
        const labels: string[] = [];
        const monthlyRevenue: number[] = [];
        const newClients: number[] = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            labels.push(d.toLocaleString('default', { month: 'short' }));
            
            const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
            const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

            const clientsThisMonth = clients.filter(c => c.createdAt?.toDate() <= endOfMonth && c.clientStatus === 'Ativo').length;
            newClients.push(clientsThisMonth);

            const revenueThisMonth = clients
                .filter(c => c.createdAt?.toDate() <= endOfMonth && c.clientStatus === 'Ativo')
                .reduce((sum, c) => sum + c.payment.monthlyFee, 0);
            monthlyRevenue.push(revenueThisMonth);
        }
        
        return { labels, monthlyRevenue, newClients };
    }, [clients]);

    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        const ctx = chartRef.current.getContext('2d');
        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Faturamento Mensal',
                        data: data.monthlyRevenue,
                        backgroundColor: '#3b82f6',
                        yAxisID: 'y',
                    },
                    {
                        label: 'Total de Clientes',
                        data: data.newClients,
                        borderColor: '#f59e0b',
                        backgroundColor: '#f59e0b',
                        type: 'line',
                        yAxisID: 'y1',
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                         title: { display: true, text: 'Faturamento (R$)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Clientes' },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                },
            }
        });
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    return <canvas ref={chartRef} height="120"></canvas>;
};


export default ReportsView;