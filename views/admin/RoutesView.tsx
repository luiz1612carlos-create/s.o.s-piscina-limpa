
import React, { useState } from 'react';
import { AppContextType, Client, Routes } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { WeatherCloudyIcon, WeatherSunnyIcon } from '../../constants';
import { Select } from '../../components/Select';

interface RoutesViewProps {
    appContext: AppContextType;
}

const weekDays: (keyof Routes)[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

const RoutesView: React.FC<RoutesViewProps> = ({ appContext }) => {
    const { routes, unscheduledClients, loading, scheduleClient, unscheduleClient, toggleRouteStatus, showNotification } = appContext;

    const [selectedClient, setSelectedClient] = useState('');
    const [selectedDay, setSelectedDay] = useState(weekDays[0]);

    const handleAddClientToRoute = async () => {
        if (!selectedClient) {
            showNotification('Selecione um cliente para agendar.', 'error');
            return;
        }
        try {
            // FIX: Ensure selectedDay is a string, as its type is inferred as `string | number`.
            await scheduleClient(selectedClient, String(selectedDay));
            showNotification('Cliente agendado com sucesso!', 'success');
            setSelectedClient('');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao agendar cliente.', 'error');
        }
    };
    
    const handleRemoveClient = async (clientId: string, day: keyof Routes) => {
         try {
            // FIX: Ensure day is a string, as its type is inferred as `string | number`.
            await unscheduleClient(clientId, String(day));
            showNotification('Cliente removido da rota.', 'info');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao remover cliente.', 'error');
        }
    };

    const handleToggleRoute = async (day: keyof Routes, currentStatus: boolean) => {
         try {
            // FIX: Ensure day is a string, as its type is inferred as `string | number`.
            await toggleRouteStatus(String(day), !currentStatus);
            showNotification(`Rota de ${day} ${!currentStatus ? 'iniciada' : 'finalizada'}.`, 'success');
        } catch (error: any) {
            showNotification(error.message || 'Erro ao atualizar status da rota.', 'error');
        }
    }


    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Gerenciamento de Rotas</h2>

            <WeatherForecast />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Unscheduled Clients */}
                <Card className="lg:col-span-1">
                    <CardHeader><h3 className="text-xl font-semibold">Clientes Não Agendados</h3></CardHeader>
                    <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                       {loading.clients ? <Spinner /> : unscheduledClients.map(client => (
                            <div key={client.id} className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                {client.name}
                            </div>
                        ))}
                    </CardContent>
                    <div className="p-4 border-t dark:border-gray-700 space-y-2">
                        <Select
                            label="Cliente"
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            options={[{ value: '', label: 'Selecione...' }, ...unscheduledClients.map(c => ({ value: c.id, label: c.name }))]}
                        />
                        <Select
                            label="Dia da Semana"
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value as any)}
                            // FIX: Ensure label is a string to match the expected type for Select options.
                            options={weekDays.map(d => ({ value: d, label: String(d) }))}
                        />
                        <Button onClick={handleAddClientToRoute} className="w-full">Agendar Cliente</Button>
                    </div>
                </Card>

                {/* Scheduled Routes */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {loading.routes || loading.clients ? <div className="col-span-full flex justify-center"><Spinner/></div> :
                        weekDays.map(day => (
                            <Card key={day}>
                                <CardHeader className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">{day}</h3>
                                     <div className="flex items-center gap-2">
                                        {routes[day]?.isRouteActive && <span className="text-xs font-bold text-green-500 animate-pulse">EM ROTA</span>}
                                        <Button size="sm" onClick={() => handleToggleRoute(day, routes[day]?.isRouteActive || false)}>
                                            {routes[day]?.isRouteActive ? 'Finalizar' : 'Iniciar Rota'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 min-h-[10rem]">
                                    {routes[day]?.clients.map(client => (
                                        <div key={client.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                            <span>{client.name}</span>
                                            <button onClick={() => handleRemoveClient(client.id, day)} className="text-red-500 hover:text-red-700">&times;</button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const WeatherForecast: React.FC = () => {
    const forecast = [
        { day: 'Hoje', temp: '28°C', icon: WeatherSunnyIcon },
        { day: 'Amanhã', temp: '26°C', icon: WeatherSunnyIcon },
        { day: 'Qua', temp: '24°C', icon: WeatherCloudyIcon },
        { day: 'Qui', temp: '27°C', icon: WeatherSunnyIcon },
        { day: 'Sex', temp: '23°C', icon: WeatherCloudyIcon },
    ];
    
    return (
        <Card className="mb-6">
            <CardContent className="flex justify-around items-center">
                {forecast.map(f => (
                    <div key={f.day} className="text-center">
                        <p className="font-bold">{f.day}</p>
                        <f.icon className="w-10 h-10 mx-auto text-yellow-500 dark:text-yellow-400" />
                        <p>{f.temp}</p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default RoutesView;
