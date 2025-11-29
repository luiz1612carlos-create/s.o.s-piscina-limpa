
import React, { useState, useEffect } from 'react';
import { AppContextType, AuthContextType, Settings } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Spinner } from '../../components/Spinner';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { TrashIcon } from '../../constants';

interface SettingsViewProps {
    appContext: AppContextType;
    authContext: AuthContextType;
}

const SettingsView: React.FC<SettingsViewProps> = ({ appContext, authContext }) => {
    const { settings, loading, updateSettings, showNotification } = appContext;
    const { changePassword } = authContext;
    const [localSettings, setLocalSettings] = useState<Settings | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    useEffect(() => {
        if (settings) {
            setLocalSettings(JSON.parse(JSON.stringify(settings)));
        }
    }, [settings]);

    if (loading.settings || !localSettings) {
        return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
    }

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>, section?: keyof Settings) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? parseFloat(value) : value;
        
        setLocalSettings(prev => {
            if (!prev) return null;
            if (section) {
                return {
                    ...prev,
                    [section]: {
                        ...(prev[section] as any),
                        [name]: finalValue,
                    }
                }
            }
            return {...prev, [name]: finalValue };
        });
    };
    
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'zip') {
            finalValue = value
                .replace(/\D/g, '')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .slice(0, 9);
        }
        setLocalSettings(prev => {
            if (!prev) return null;
            return {
                ...prev!,
                baseAddress: {
                    ...prev!.baseAddress,
                    [name]: finalValue,
                },
            };
        });
    };

    const handleToggle = (feature: keyof Settings['features']) => {
        setLocalSettings(prev => ({
            ...prev!,
            features: {
                ...prev!.features,
                [feature]: !prev!.features[feature]
            }
        }));
    };
    
     const handleTierChange = (index: number, field: 'upTo' | 'price', value: number) => {
        const newTiers = [...localSettings.pricing.volumeTiers];
        newTiers[index][field] = value;
        setLocalSettings(prev => ({...prev!, pricing: {...prev!.pricing, volumeTiers: newTiers}}));
    };

    const addTier = () => {
        const newTiers = [...localSettings.pricing.volumeTiers, {upTo: 0, price: 0}];
        setLocalSettings(prev => ({...prev!, pricing: {...prev!.pricing, volumeTiers: newTiers}}));
    };

    const removeTier = (index: number) => {
        const newTiers = localSettings.pricing.volumeTiers.filter((_, i) => i !== index);
        setLocalSettings(prev => ({...prev!, pricing: {...prev!.pricing, volumeTiers: newTiers}}));
    };
    
    const handleBenefitChange = (plan: 'simple' | 'vip', index: number, value: string) => {
        const newBenefits = [...localSettings.plans[plan].benefits];
        newBenefits[index] = value;
        setLocalSettings(prev => ({...prev!, plans: {...prev!.plans, [plan]: {...prev!.plans[plan], benefits: newBenefits}}}));
    };
    
    const addBenefit = (plan: 'simple' | 'vip') => {
        const newBenefits = [...localSettings.plans[plan].benefits, 'Novo benefício'];
        setLocalSettings(prev => ({...prev!, plans: {...prev!.plans, [plan]: {...prev!.plans[plan], benefits: newBenefits}}}));
    };

    const removeBenefit = (plan: 'simple' | 'vip', index: number) => {
        const newBenefits = localSettings.plans[plan].benefits.filter((_, i) => i !== index);
        setLocalSettings(prev => ({...prev!, plans: {...prev!.plans, [plan]: {...prev!.plans[plan], benefits: newBenefits}}}));
    };


    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings(localSettings);
            showNotification('Configurações salvas com sucesso!', 'success');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao salvar configurações.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification('As senhas não coincidem.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showNotification('A senha precisa ter no mínimo 6 caracteres.', 'error');
            return;
        }
        setIsSavingPassword(true);
        try {
            await changePassword(newPassword);
            showNotification('Senha alterada com sucesso!', 'success');
            setNewPassword('');
            setConfirmPassword('');
        } catch(error: any) {
            showNotification(error.message || 'Erro ao alterar a senha.', 'error');
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Configurações Gerais</h2>
                <Button onClick={handleSave} isLoading={isSaving}>Salvar Alterações</Button>
            </div>
            <div className="space-y-8">
                {/* Company Info */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">Informações da Empresa e Tela Inicial</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="Nome da Empresa (para painéis)" name="companyName" value={localSettings.companyName} onChange={(e) => handleSimpleChange(e)} />
                        <Input label="Chave PIX Padrão" name="pixKey" value={localSettings.pixKey} onChange={(e) => handleSimpleChange(e)} />
                        <Input containerClassName="md:col-span-2" label="Título Principal (Tela Inicial)" name="mainTitle" value={localSettings.mainTitle || ''} onChange={(e) => handleSimpleChange(e)} />
                        <Input containerClassName="md:col-span-2" label="Subtítulo (Tela Inicial)" name="mainSubtitle" value={localSettings.mainSubtitle || ''} onChange={(e) => handleSimpleChange(e)} />
                    </div>
                     <fieldset className="mt-4 border p-4 rounded-md dark:border-gray-600">
                        <legend className="px-2 font-semibold">Endereço da Empresa</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 mt-2">
                            <Input
                                containerClassName="sm:col-span-2"
                                label="CEP"
                                name="zip"
                                value={localSettings.baseAddress.zip}
                                onChange={handleAddressChange}
                                placeholder="00000-000"
                                pattern="[0-9]{5}-[0-9]{3}"
                                title="Formato do CEP: 12345-678"
                                maxLength={9}
                            />
                            <Input containerClassName="sm:col-span-4" label="Rua" name="street" value={localSettings.baseAddress.street} onChange={handleAddressChange} />
                            <Input containerClassName="sm:col-span-2" label="Número" name="number" value={localSettings.baseAddress.number} onChange={handleAddressChange} />
                            <Input containerClassName="sm:col-span-4" label="Bairro" name="neighborhood" value={localSettings.baseAddress.neighborhood} onChange={handleAddressChange} />
                            <Input containerClassName="sm:col-span-4" label="Cidade" name="city" value={localSettings.baseAddress.city} onChange={handleAddressChange} />
                            <Input containerClassName="sm:col-span-2" label="UF" name="state" value={localSettings.baseAddress.state} onChange={handleAddressChange} maxLength={2} />
                        </div>
                    </fieldset>
                </div>
                
                 {/* Automations */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">Automações</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input 
                            label="Gerar sugestão de reposição quando estoque for menor ou igual a (unidades)" 
                            name="replenishmentStockThreshold" 
                            type="number" 
                            value={localSettings.automation.replenishmentStockThreshold} 
                            onChange={(e) => handleSimpleChange(e, 'automation')} 
                        />
                    </div>
                </div>

                {/* Pricing */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">Precificação</h3>
                     <div className="grid md:grid-cols-4 gap-4 mb-4">
                         <Input label="Valor por KM" name="perKm" type="number" value={localSettings.pricing.perKm} onChange={(e) => handleSimpleChange(e, 'pricing')} />
                         <Input label="Taxa Água de Poço" name="wellWaterFee" type="number" value={localSettings.pricing.wellWaterFee} onChange={(e) => handleSimpleChange(e, 'pricing')} />
                         <Input label="Taxa de Produtos" name="productsFee" type="number" value={localSettings.pricing.productsFee} onChange={(e) => handleSimpleChange(e, 'pricing')} />
                         <Input label="Desconto VIP (%)" name="vipDiscountPercent" type="number" value={localSettings.pricing.vipDiscountPercent} onChange={(e) => handleSimpleChange(e, 'pricing')} />
                    </div>
                    <h4 className="font-semibold mt-6 mb-2">Faixas de Preço por Volume</h4>
                    {localSettings.pricing.volumeTiers.map((tier, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                           <span>Até</span>
                           <Input label="" type="number" value={tier.upTo} onChange={(e) => handleTierChange(index, 'upTo', +e.target.value)} containerClassName="mb-0" />
                           <span>litros, custa R$</span>
                           <Input label="" type="number" value={tier.price} onChange={(e) => handleTierChange(index, 'price', +e.target.value)} containerClassName="mb-0" />
                           <Button variant="danger" size="sm" onClick={() => removeTier(index)}><TrashIcon className="w-4 h-4"/></Button>
                        </div>
                    ))}
                    <Button variant="secondary" size="sm" onClick={addTier}>Adicionar Faixa</Button>
                </div>

                {/* Plans */}
                <div className="grid md:grid-cols-2 gap-8">
                    <PlanEditor title="Plano Simples" planKey="simple" plan={localSettings.plans.simple} onBenefitChange={handleBenefitChange} addBenefit={addBenefit} removeBenefit={removeBenefit} setLocalSettings={setLocalSettings} />
                    <PlanEditor title="Plano VIP" planKey="vip" plan={localSettings.plans.vip} onBenefitChange={handleBenefitChange} addBenefit={addBenefit} removeBenefit={removeBenefit} setLocalSettings={setLocalSettings}/>
                </div>

                {/* Features */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">Gerenciamento de Funcionalidades</h3>
                    <div className="space-y-4">
                        <ToggleSwitch label="Ativar Plano VIP" enabled={localSettings.features.vipPlanEnabled} onChange={() => handleToggle('vipPlanEnabled')} />
                        <ToggleSwitch label="Ativar Loja para Clientes" enabled={localSettings.features.storeEnabled} onChange={() => handleToggle('storeEnabled')} />
                        <ToggleSwitch label="Ativar Plano de Adiantamento" enabled={localSettings.features.advancePaymentPlanEnabled} onChange={() => handleToggle('advancePaymentPlanEnabled')} />
                    </div>
                </div>

                {/* My Account */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">Minha Conta</h3>
                     <form onSubmit={handlePasswordChange} className="space-y-4">
                        <h4 className="font-semibold">Alterar Senha</h4>
                        <div className="grid md:grid-cols-3 gap-4 items-end">
                             <Input label="Nova Senha" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} containerClassName="mb-0" />
                             <Input label="Confirmar Nova Senha" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} containerClassName="mb-0" />
                             <Button type="submit" isLoading={isSavingPassword}>Salvar Nova Senha</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const PlanEditor = ({ title, planKey, plan, onBenefitChange, addBenefit, removeBenefit, setLocalSettings }: any) => {
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSettings((prev: Settings | null) => ({...prev!, plans: {...prev!.plans, [planKey]: {...prev!.plans[planKey], title: e.target.value}}}));
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">{title}</h3>
            <Input label="Título do Plano" value={plan.title} onChange={handleTitleChange} />
            <h4 className="font-semibold mt-4 mb-2">Benefícios</h4>
            {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                    <Input label="" value={benefit} onChange={(e) => onBenefitChange(planKey, index, e.target.value)} containerClassName="flex-grow mb-0" />
                    <Button variant="danger" size="sm" onClick={() => removeBenefit(planKey, index)}><TrashIcon className="w-4 h-4"/></Button>
                </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => addBenefit(planKey)}>Adicionar Benefício</Button>
        </div>
    );
};


export default SettingsView;