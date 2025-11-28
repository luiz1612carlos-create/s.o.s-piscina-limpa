
import React, { useState } from 'react';
import { AppContextType, PreBudget, Address } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/Card';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';

interface ApprovalsViewProps {
    appContext: AppContextType;
}

const formatAddress = (address: Address) => {
    if (!address) return 'N/A';
    return `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city} - ${address.state}, ${address.zip}`;
};

const ApprovalsView: React.FC<ApprovalsViewProps> = ({ appContext }) => {
    const { preBudgets, loading, approveBudget, rejectBudget, showNotification } = appContext;
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (budgetId: string) => {
        setProcessingId(budgetId);
        try {
            await approveBudget(budgetId);
            showNotification('Cliente aprovado e criado com sucesso!', 'success');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao aprovar orçamento.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (budgetId: string) => {
        setProcessingId(budgetId);
        try {
            await rejectBudget(budgetId);
            showNotification('Orçamento rejeitado.', 'info');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao rejeitar orçamento.', 'error');
        } finally {
            setProcessingId(null);
        }
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Aprovações Pendentes</h2>
            {loading.preBudgets ? (
                <div className="flex justify-center mt-8"><Spinner size="lg" /></div>
            ) : preBudgets.length === 0 ? (
                <p>Nenhum orçamento pendente no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {preBudgets.map(budget => (
                        <Card key={budget.id}>
                            <CardHeader>
                                <h3 className="text-xl font-semibold">{budget.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{budget.email}</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p><strong>Telefone:</strong> {budget.phone}</p>
                                <p><strong>Endereço:</strong> {formatAddress(budget.address)}</p>
                                <p><strong>Volume:</strong> {budget.poolVolume.toLocaleString('pt-BR')} L</p>
                                <p><strong>Plano:</strong> <span className={`font-bold ${budget.plan === 'VIP' ? 'text-yellow-500' : 'text-blue-500'}`}>{budget.plan}</span></p>
                                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 text-center">
                                    R$ {budget.monthlyFee.toFixed(2).replace('.', ',')} / mês
                                </p>
                            </CardContent>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleReject(budget.id)}
                                    isLoading={processingId === budget.id}
                                    disabled={!!processingId}
                                >
                                    Recusar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleApprove(budget.id)}
                                    isLoading={processingId === budget.id}
                                    disabled={!!processingId}
                                >
                                    Aprovar
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApprovalsView;