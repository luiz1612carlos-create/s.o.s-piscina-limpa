
import React, { useState, useMemo, useEffect } from 'react';
// FIX: Import Product type.
import { AppContextType, Client, ClientProduct, PlanType, ClientStatus, PoolUsageStatus, PaymentStatus, Product, Address } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/Card';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { TrashIcon } from '../../constants';

interface ClientsViewProps {
    appContext: AppContextType;
}

const formatAddress = (address: Address) => {
    if (!address) return 'N/A';
    return `${address.street}, ${address.number} - ${address.city}`;
};


const ClientsView: React.FC<ClientsViewProps> = ({ appContext }) => {
    const { clients, loading, products, updateClient, deleteClient, markAsPaid, updateClientStock, showNotification } = appContext;
    const [filterPlan, setFilterPlan] = useState<PlanType | 'Todos'>('Todos');
    const [filterStatus, setFilterStatus] = useState<ClientStatus | 'Todos'>('Todos');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const planMatch = filterPlan === 'Todos' || client.plan === filterPlan;
            const statusMatch = filterStatus === 'Todos' || client.clientStatus === filterStatus;
            return planMatch && statusMatch;
        });
    }, [clients, filterPlan, filterStatus]);

    const handleOpenModal = (client: Client) => {
        setSelectedClient(client);
    };

    const handleCloseModal = () => {
        setSelectedClient(null);
    };
    
    const handleSaveChanges = async (clientToSave: Client) => {
        if (!clientToSave) return;
        setIsSaving(true);
        try {
            const { id, ...dataToUpdate } = clientToSave;
            await updateClient(id, dataToUpdate);
            showNotification('Cliente atualizado com sucesso!', 'success');
            handleCloseModal();
        } catch (error: any) {
            showNotification(error.message || 'Falha ao salvar alterações.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async () => {
        if (!selectedClient || !window.confirm(`Tem certeza que deseja excluir ${selectedClient.name}? Esta ação é irreversível.`)) return;
        
        setIsDeleting(true);
        try {
            await deleteClient(selectedClient.id);
            showNotification('Cliente excluído com sucesso!', 'success');
            handleCloseModal();
        } catch(error: any) {
            showNotification(error.message || 'Falha ao excluir cliente.', 'error');
        } finally {
            setIsDeleting(false);
        }
    }
    
    const handleMarkPaid = async () => {
        if(!selectedClient) return;
        setIsSaving(true);
        try {
            await markAsPaid(selectedClient);
            showNotification('Pagamento registrado com sucesso!', 'success');
             // Manually update the client in the modal to reflect the change immediately
            setSelectedClient(prev => prev ? {
                ...prev,
                payment: {
                    ...prev.payment,
                    status: 'Pago',
                    dueDate: new Date(new Date(prev.payment.dueDate).setMonth(new Date(prev.payment.dueDate).getMonth() + 1)).toISOString()
                }
            } : null);
        } catch (error: any) {
             showNotification(error.message || 'Falha ao registrar pagamento.', 'error');
        } finally {
             setIsSaving(false);
        }
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Gerenciamento de Clientes</h2>
            <div className="flex space-x-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <Select
                    label="Filtrar por Plano"
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value as any)}
                    options={[{ value: 'Todos', label: 'Todos' }, { value: 'Simples', label: 'Simples' }, { value: 'VIP', label: 'VIP' }]}
                    containerClassName="mb-0"
                />
                <Select
                    label="Filtrar por Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    options={[{ value: 'Todos', label: 'Todos' }, { value: 'Ativo', label: 'Ativo' }, { value: 'Pendente', label: 'Pendente' }]}
                    containerClassName="mb-0"
                />
            </div>

            {loading.clients ? (
                <div className="flex justify-center mt-8"><Spinner size="lg" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredClients.map(client => (
                        <Card key={client.id} className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300" onClick={() => handleOpenModal(client)}>
                            <CardHeader>
                                <h3 className="text-lg font-semibold truncate">{client.name}</h3>
                                <p className={`text-sm font-bold ${client.plan === 'VIP' ? 'text-yellow-500' : 'text-blue-500'}`}>{client.plan}</p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{formatAddress(client.address)}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{client.phone}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            
            {selectedClient && (
                <ClientEditModal 
                    client={selectedClient} 
                    isOpen={!!selectedClient} 
                    onClose={handleCloseModal}
                    onSave={handleSaveChanges}
                    onDelete={handleDeleteClient}
                    onMarkPaid={handleMarkPaid}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    products={products}
                />
            )}
        </div>
    );
};


interface ClientEditModalProps {
    client: Client;
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Client) => void;
    onDelete: () => void;
    onMarkPaid: () => void;
    isSaving: boolean;
    isDeleting: boolean;
    products: Product[];
}

const ClientEditModal: React.FC<ClientEditModalProps> = (props) => {
    const { client, isOpen, onClose, onSave, onDelete, onMarkPaid, isSaving, isDeleting, products } = props;
    const [clientData, setClientData] = useState<Client>(client);

     useEffect(() => {
        setClientData(client);
    }, [client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let finalValue: string | number = value;
        if (name === 'address.zip') {
            finalValue = value
                .replace(/\D/g, '') // Remove non-digit characters
                .replace(/(\d{5})(\d)/, '$1-$2') // Add hyphen after 5th digit
                .slice(0, 9); // Limit to 9 characters (XXXXX-XXX)
        } else if (type === 'number') {
            finalValue = parseFloat(value) || 0;
        }

        const keys = name.split('.');
        
        setClientData(prev => {
            if (keys.length > 1) {
                const [section, field] = keys;
                return {
                    ...prev,
                    [section]: {
                        ...(prev as any)[section],
                        [field]: finalValue
                    }
                };
            }
            return {
                ...prev,
                [name]: finalValue,
            };
        });
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar Cliente: ${client.name}`} size="xl">
            <div className="space-y-4">
                {/* Personal Info */}
                <fieldset className="border p-4 rounded-md dark:border-gray-600">
                    <legend className="px-2 font-semibold">Dados Pessoais</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                         <Input label="Nome" name="name" value={clientData.name} onChange={handleChange} />
                         <Input label="Email" name="email" type="email" value={clientData.email} onChange={handleChange} />
                         <Input label="Telefone" name="phone" value={clientData.phone} onChange={handleChange} />
                         <div />
                         <Select label="Plano" name="plan" value={clientData.plan} onChange={handleChange} options={[{value: 'Simples', label: 'Simples'}, {value: 'VIP', label: 'VIP'}]} />
                         <Select label="Status do Cliente" name="clientStatus" value={clientData.clientStatus} onChange={handleChange} options={[{value: 'Ativo', label: 'Ativo'}, {value: 'Pendente', label: 'Pendente'}]} />
                    </div>
                </fieldset>

                <fieldset className="border p-4 rounded-md dark:border-gray-600">
                    <legend className="px-2 font-semibold">Endereço</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 mt-2">
                        <Input
                            containerClassName="sm:col-span-2"
                            label="CEP"
                            name="address.zip"
                            value={clientData.address.zip}
                            onChange={handleChange}
                            placeholder="00000-000"
                            pattern="[0-9]{5}-[0-9]{3}"
                            title="Formato do CEP: 12345-678"
                            maxLength={9}
                        />
                        <Input containerClassName="sm:col-span-4" label="Rua" name="address.street" value={clientData.address.street} onChange={handleChange} />
                        <Input containerClassName="sm:col-span-2" label="Número" name="address.number" value={clientData.address.number} onChange={handleChange} />
                        <Input containerClassName="sm:col-span-4" label="Bairro" name="address.neighborhood" value={clientData.address.neighborhood} onChange={handleChange} />
                        <Input containerClassName="sm:col-span-4" label="Cidade" name="address.city" value={clientData.address.city} onChange={handleChange} />
                        <Input containerClassName="sm:col-span-2" label="UF" name="address.state" value={clientData.address.state} onChange={handleChange} maxLength={2} />
                    </div>
                </fieldset>

                {/* Pool Status */}
                <fieldset className="border p-4 rounded-md dark:border-gray-600">
                    <legend className="px-2 font-semibold">Status da Piscina</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                        <Input label="pH" name="poolStatus.ph" type="number" step="0.1" value={clientData.poolStatus.ph} onChange={handleChange}/>
                        <Input label="Cloro" name="poolStatus.cloro" type="number" step="0.1" value={clientData.poolStatus.cloro} onChange={handleChange}/>
                        <Input label="Alcalinidade" name="poolStatus.alcalinidade" type="number" value={clientData.poolStatus.alcalinidade} onChange={handleChange}/>
                        <Select label="Uso" name="poolStatus.uso" value={clientData.poolStatus.uso} onChange={handleChange} options={[{value: 'Livre para uso', label: 'Livre para uso'}, {value: 'Em tratamento', label: 'Em tratamento'}]} />
                    </div>
                </fieldset>
                
                 {/* Payment Info */}
                <fieldset className="border p-4 rounded-md dark:border-gray-600">
                    <legend className="px-2 font-semibold">Pagamento</legend>
                    <div className="flex items-center justify-between mt-2">
                        <div>
                            <p>Status: <span className="font-bold">{clientData.payment.status}</span></p>
                            <p>Vencimento: {new Date(clientData.payment.dueDate).toLocaleDateString('pt-BR')}</p>
                            <p>Mensalidade: R$ {clientData.payment.monthlyFee.toFixed(2)}</p>
                        </div>
                        <Button onClick={onMarkPaid} isLoading={isSaving} disabled={clientData.payment.status === 'Pago'}>
                            Marcar como Pago
                        </Button>
                    </div>
                    <div className="mt-4">
                        <Input
                            label="Chave PIX do Cliente (Opcional)"
                            name="pixKey"
                            value={clientData.pixKey || ''}
                            onChange={handleChange}
                            placeholder="Deixe em branco para usar a chave padrão"
                        />
                    </div>
                </fieldset>
                
                {/* Client Stock */}
                <ClientStockManager stock={clientData.stock} allProducts={products} onStockChange={(newStock) => setClientData(prev => ({...prev, stock: newStock}))} />

            </div>
            <div className="mt-6 flex justify-between">
                <Button variant="danger" onClick={onDelete} isLoading={isDeleting}>
                    Excluir Cliente
                </Button>
                <div className="flex space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onSave(clientData)} isLoading={isSaving}>Salvar Alterações</Button>
                </div>
            </div>
        </Modal>
    )
}

const ClientStockManager = ({ stock, allProducts, onStockChange }: { stock: ClientProduct[], allProducts: Product[], onStockChange: (stock: ClientProduct[]) => void }) => {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);

    const addProductToStock = () => {
        const productToAdd = allProducts.find(p => p.id === selectedProduct);
        if (productToAdd && !stock.some(p => p.productId === selectedProduct)) {
            onStockChange([...stock, { productId: productToAdd.id, name: productToAdd.name, quantity }]);
        }
    };

    const removeProductFromStock = (productId: string) => {
        onStockChange(stock.filter(p => p.productId !== productId));
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
        onStockChange(stock.map(p => p.productId === productId ? { ...p, quantity: newQuantity } : p));
    };

    return (
        <fieldset className="border p-4 rounded-md dark:border-gray-600">
            <legend className="px-2 font-semibold">Estoque de Produtos do Cliente</legend>
            <div className="flex gap-2 my-2">
                <Select
                    label=""
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                    options={[{ value: '', label: 'Selecione um produto...' }, ...allProducts.map(p => ({ value: p.id, label: p.name }))]}
                    containerClassName="flex-1 mb-0"
                />
                <Input
                    label=""
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value))}
                    min="1"
                    containerClassName="w-24 mb-0"
                />
                <Button onClick={addProductToStock} size="md" className="self-end">+</Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {stock.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <span>{item.name}</span>
                        <div className="flex items-center gap-2">
                            <Input
                                label=""
                                type="number"
                                value={item.quantity}
                                onChange={e => updateQuantity(item.productId, parseInt(e.target.value))}
                                min="0"
                                containerClassName="w-20 mb-0"
                                className="p-1 text-center"
                            />
                            <Button variant="danger" size="sm" onClick={() => removeProductFromStock(item.productId)}>
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </fieldset>
    );
};


export default ClientsView;