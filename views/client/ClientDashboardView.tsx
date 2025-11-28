
import React, { useState, useEffect, useMemo } from 'react';
import { AuthContextType, AppContextType, Client } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { WeatherSunnyIcon, CopyIcon } from '../../constants';

interface ClientDashboardViewProps {
    authContext: AuthContextType;
    appContext: AppContextType;
}

const ClientDashboardView: React.FC<ClientDashboardViewProps> = ({ authContext, appContext }) => {
    const { changePassword, showNotification } = authContext;
    const { getClientData, settings, routes } = appContext;
    const [clientData, setClientData] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    useEffect(() => {
        const fetchClientData = async () => {
            setLoading(true);
            const data = await getClientData();
            setClientData(data);
            setLoading(false);
        };
        fetchClientData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const nextVisit = useMemo(() => {
        if (!clientData || !routes) return null;
        for (const dayKey of Object.keys(routes)) {
            const day = routes[dayKey];
            if (day.clients.some(c => c.id === clientData.id)) {
                return { day: day.day, isRouteActive: day.isRouteActive };
            }
        }
        return null;
    }, [clientData, routes]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification('As senhas não coincidem.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showNotification('A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        
        setIsSavingPassword(true);
        try {
            await changePassword(newPassword);
            showNotification('Senha alterada com sucesso!', 'success');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao alterar senha.', 'error');
        } finally {
            setIsSavingPassword(false);
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showNotification('Chave PIX copiada!', 'info');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }
    if (!clientData) {
        return <p>Não foi possível carregar os dados do cliente.</p>;
    }

    const pixKeyToDisplay = clientData.pixKey || settings?.pixKey || '';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Pool Status */}
                <Card>
                    <CardHeader><h3 className="text-xl font-semibold">Status Atual da Piscina</h3></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div><p className="text-sm text-gray-500">pH</p><p className="text-2xl font-bold">{clientData.poolStatus.ph.toFixed(1)}</p></div>
                        <div><p className="text-sm text-gray-500">Cloro</p><p className="text-2xl font-bold">{clientData.poolStatus.cloro.toFixed(1)}</p></div>
                        <div><p className="text-sm text-gray-500">Alcalinidade</p><p className="text-2xl font-bold">{clientData.poolStatus.alcalinidade}</p></div>
                        <div className={`${clientData.poolStatus.uso === 'Livre para uso' ? 'text-green-500' : 'text-yellow-500'}`}>
                            <p className="text-sm">Uso</p>
                            <p className="text-lg font-bold">{clientData.poolStatus.uso}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Visit & Payment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><h3 className="text-xl font-semibold">Próxima Visita</h3></CardHeader>
                        <CardContent className="text-center">
                            {nextVisit ? (
                                <>
                                    <WeatherSunnyIcon className="w-16 h-16 mx-auto text-yellow-400 mb-2"/>
                                    <p className="text-3xl font-bold">{nextVisit.day}</p>
                                    <p className="text-gray-500">Previsão: Ensolarado, 28°C</p>
                                    {nextVisit.isRouteActive && <p className="mt-2 text-green-500 font-bold animate-pulse">Equipe em rota!</p>}
                                </>
                            ) : <p>Nenhuma visita agendada.</p>}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><h3 className="text-xl font-semibold">Pagamento</h3></CardHeader>
                        <CardContent className="text-center">
                            <p className="text-gray-500">Próximo Vencimento</p>
                            <p className="text-3xl font-bold mb-2">{new Date(clientData.payment.dueDate).toLocaleDateString('pt-BR')}</p>
                             <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <p className="text-xs">Pague com PIX:</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="font-mono text-sm">{pixKeyToDisplay}</p>
                                    <button onClick={() => pixKeyToDisplay && copyToClipboard(pixKeyToDisplay)} className="text-gray-500 hover:text-primary-500">
                                        <CopyIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                </div>

                {/* My Account */}
                <Card>
                    <CardHeader><h3 className="text-xl font-semibold">Minha Conta</h3></CardHeader>
                    <CardContent>
                        <p><strong>Nome:</strong> {clientData.name}</p>
                        <p><strong>Email:</strong> {clientData.email}</p>
                        <p><strong>Telefone:</strong> {clientData.phone}</p>
                        <hr className="my-4 dark:border-gray-700"/>
                        <h4 className="font-semibold mb-2">Alterar Senha</h4>
                        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <Input label="Nova Senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} containerClassName="mb-0"/>
                            <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} containerClassName="mb-0"/>
                            <Button type="submit" isLoading={isSavingPassword}>Salvar Senha</Button>
                        </form>
                    </CardContent>
                </Card>

            </div>

            {/* My Products */}
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader><h3 className="text-xl font-semibold">Meus Produtos</h3></CardHeader>
                    <CardContent className="space-y-3 max-h-[80vh] overflow-y-auto">
                        {clientData.stock.length > 0 ? clientData.stock.map(item => (
                            <div key={item.productId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                </div>
                                <div className="text-right">
                                     <p className="font-bold text-lg">{item.quantity}</p>
                                     {item.quantity <= 2 && <p className="text-xs text-red-500 font-semibold">Reposição recomendada</p>}
                                </div>
                            </div>
                        )) : <p>Nenhum produto em seu estoque.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ClientDashboardView;