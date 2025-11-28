
import React, { useState } from 'react';
import { AppContextType, Product, Order, OrderStatus } from '../../types';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Spinner } from '../../components/Spinner';
import { EditIcon, TrashIcon, PlusIcon } from '../../constants';
import { Select } from '../../components/Select';

interface StoreAdminViewProps {
    appContext: AppContextType;
}

const StoreAdminView: React.FC<StoreAdminViewProps> = ({ appContext }) => {
    const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Gerenciamento da Loja</h2>
            <div className="flex border-b dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`py-2 px-4 text-lg font-semibold ${activeTab === 'products' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}
                >
                    Produtos
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`py-2 px-4 text-lg font-semibold ${activeTab === 'orders' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}
                >
                    Pedidos
                </button>
            </div>
            {activeTab === 'products' ? <ProductsManagement appContext={appContext} /> : <OrdersManagement appContext={appContext} />}
        </div>
    );
};

const ProductsManagement = ({ appContext }: { appContext: AppContextType }) => {
    const { products, loading, saveProduct, deleteProduct, showNotification } = appContext;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | Omit<Product, 'id'> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenModal = (product: Product | null = null) => {
        if (product) {
            setSelectedProduct(product);
        } else {
            setSelectedProduct({ name: '', description: '', price: 0, stock: 0, imageUrl: `https://picsum.photos/400/300?random=${Date.now()}` });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    const handleSave = async () => {
        if (!selectedProduct) return;
        setIsSaving(true);
        try {
            await saveProduct(selectedProduct);
            showNotification('Produto salvo com sucesso!', 'success');
            handleCloseModal();
        } catch (error: any) {
            showNotification(error.message || 'Erro ao salvar produto.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (productId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await deleteProduct(productId);
                showNotification('Produto excluído com sucesso!', 'success');
            } catch (error: any) {
                showNotification(error.message || 'Erro ao excluir produto.', 'error');
            }
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={() => handleOpenModal()}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Adicionar Produto
                </Button>
            </div>
            {loading.products ? <Spinner /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                        <div key={product.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                            <img src={product.imageUrl} alt={product.name} className="h-48 w-full object-cover" />
                            <div className="p-4">
                                <h3 className="font-bold text-lg">{product.name}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">{product.description}</p>
                                <p className="text-primary-500 font-bold mt-2">R$ {product.price.toFixed(2)}</p>
                                <p className="text-sm">Estoque: {product.stock}</p>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 flex justify-end gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleOpenModal(product)}><EditIcon className="w-4 h-4" /></Button>
                                <Button size="sm" variant="danger" onClick={() => handleDelete(product.id)}><TrashIcon className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {isModalOpen && selectedProduct && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={'id' in selectedProduct ? 'Editar Produto' : 'Adicionar Produto'}>
                    <ProductForm product={selectedProduct} setProduct={setSelectedProduct} />
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSave} isLoading={isSaving}>Salvar</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

const ProductForm = ({ product, setProduct }: { product: any, setProduct: any }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setProduct({ ...product, [name]: type === 'number' ? parseFloat(value) : value });
    };

    return (
        <div className="space-y-4">
            <Input label="Nome do Produto" name="name" value={product.name} onChange={handleChange} />
            <Input label="Descrição" name="description" value={product.description} onChange={handleChange} />
            <Input label="Preço" name="price" type="number" step="0.01" value={product.price} onChange={handleChange} />
            <Input label="Estoque" name="stock" type="number" value={product.stock} onChange={handleChange} />
            <Input label="URL da Imagem" name="imageUrl" value={product.imageUrl} onChange={handleChange} />
        </div>
    );
}


const OrdersManagement = ({ appContext }: { appContext: AppContextType }) => {
    const { orders, loading, updateOrderStatus, showNotification } = appContext;
    
    const handleStatusChange = async (orderId: string, status: OrderStatus) => {
        try {
            await updateOrderStatus(orderId, status);
            showNotification('Status do pedido atualizado!', 'success');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao atualizar status.', 'error');
        }
    };
    
    return (
        <div>
            {loading.orders ? <Spinner /> : (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{order.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">R$ {order.total.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(order.createdAt?.toDate()).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Select 
                                            label=""
                                            value={order.status} 
                                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                            options={[{value: 'Pendente', label: 'Pendente'}, {value: 'Enviado', label: 'Enviado'}, {value: 'Entregue', label: 'Entregue'}]}
                                            containerClassName="mb-0"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


export default StoreAdminView;
