
import React, { useState } from 'react';
import { AuthContextType, AppContextType } from '../../types';
import { MoonIcon, SunIcon, LogoutIcon, UsersIcon, RouteIcon, CheckBadgeIcon, StoreIcon, SettingsIcon } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import ClientsView from './ClientsView';
import RoutesView from './RoutesView';
import ApprovalsView from './ApprovalsView';
import StoreAdminView from './StoreAdminView';
import SettingsView from './SettingsView';

interface AdminLayoutProps {
    authContext: AuthContextType;
    appContext: AppContextType;
}

type AdminView = 'clients' | 'routes' | 'approvals' | 'store' | 'settings';

const AdminLayout: React.FC<AdminLayoutProps> = ({ authContext, appContext }) => {
    const { user } = authContext;
    const { theme, toggleTheme } = useTheme();
    const [currentView, setCurrentView] = useState<AdminView>('approvals');

    const menuItems = [
        { id: 'approvals', label: 'Aprovações', icon: CheckBadgeIcon, count: appContext.preBudgets.length },
        { id: 'clients', label: 'Clientes', icon: UsersIcon },
        { id: 'routes', label: 'Rotas', icon: RouteIcon },
        { id: 'store', label: 'Loja', icon: StoreIcon },
        { id: 'settings', label: 'Configurações', icon: SettingsIcon },
    ];
    
    const renderView = () => {
        switch (currentView) {
            case 'clients': return <ClientsView appContext={appContext} />;
            case 'routes': return <RoutesView appContext={appContext} />;
            case 'approvals': return <ApprovalsView appContext={appContext} />;
            case 'store': return <StoreAdminView appContext={appContext} />;
            case 'settings': return <SettingsView appContext={appContext} />;
            default: return <ApprovalsView appContext={appContext} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
                <div className="p-4 border-b dark:border-gray-700">
                    <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{appContext.settings?.companyName || 'AquaManager Pro'}</h1>
                    <p className="text-sm text-gray-500">Painel Admin</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id as AdminView)}
                            className={`w-full flex items-center p-2 rounded-md transition-colors ${currentView === item.id ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <item.icon className="w-6 h-6 mr-3" />
                            <span>{item.label}</span>
                            {item.count !== undefined && item.count > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.count}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-end items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Bem-vindo, {user?.email}</span>
                     <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                        {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={authContext.logout} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <LogoutIcon className="w-6 h-6" />
                    </button>
                </header>
                {/* Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
