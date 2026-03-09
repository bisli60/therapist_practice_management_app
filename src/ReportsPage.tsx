import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
} from "recharts";

import { Id } from "../convex/_generated/dataModel";

const COLORS = ["#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#f59e0b", "#06b6d4"];

type TimeRange = '7d' | '30d' | 'ytd';

export function ReportsPage({ userId }: { userId: Id<"users"> }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  
  const sessions = useQuery(api.sessions.list, { userId }) || [];
  const payments = useQuery(api.payments.list, { userId }) || [];

  const filterDataByRange = (data: any[]) => {
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (timeRange === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    return data.filter(item => {
      const itemDate = new Date(item.date || (item as any)._creationTime);
      return itemDate >= startDate;
    });
  };

  const filteredPayments = useMemo(() => filterDataByRange(payments), [payments, timeRange]);
  const filteredSessions = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
    else if (timeRange === 'ytd') startDate = new Date(now.getFullYear(), 0, 1);

    return sessions.filter(s => new Date(s.date || (s as any)._creationTime) >= startDate);
  }, [sessions, timeRange]);

  const parseTreatmentType = (notes?: string) => {
    if (!notes) return "טיפול";
    const typeMatch = notes.match(/סוג טיפול: (.*?)(?: \||$)/);
    return typeMatch ? typeMatch[1] : "טיפול";
  };

  const dailyData = useMemo(() => {
    const data = [];
    const today = new Date();
    const daysToShow = timeRange === '7d' ? 7 : (timeRange === '30d' ? 30 : 30); // Show last 30 even for YTD to avoid overcrowding
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const dayNames = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
      const dayName = dayNames[date.getDay()];

      const dailyIncome = payments
        .filter(p => p.date === dateStr && !p.isWriteOff)
        .reduce((sum, p) => sum + p.amount, 0);

      data.push({
        name: daysToShow > 7 ? `${date.getDate()}/${date.getMonth() + 1}` : dayName,
        income: dailyIncome,
        fullDate: date.toLocaleDateString("he-IL"),
      });
    }
    return data;
  }, [payments, timeRange]);

  const monthlyData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    let monthsToShow = 12;
    if (timeRange === '7d' || timeRange === '30d') monthsToShow = 2; // Show current and previous
    if (timeRange === 'ytd') monthsToShow = today.getMonth() + 1;

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthNames = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
      const monthName = monthNames[month];

      const monthlyIncome = payments
        .filter(p => {
          const pDate = new Date(p.date);
          return pDate.getMonth() === month && pDate.getFullYear() === year && !p.isWriteOff;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      data.push({
        name: monthName,
        income: monthlyIncome,
        year: year,
      });
    }
    return data;
  }, [payments, timeRange]);

  const typeData = useMemo(() => {
    const typeMap: { [key: string]: number } = {};
    let total = 0;

    filteredPayments.forEach(payment => {
      if (payment.isWriteOff) return;
      
      let type = "אחר";
      const linkedSession = filteredSessions.find(s => s.paymentId === payment._id);
      
      if (linkedSession) {
        type = parseTreatmentType(linkedSession.notes);
      } else if (payment.notes?.includes("טיפול")) {
        const match = payment.notes.match(/טיפול (.*)/);
        if (match) type = match[1];
      }

      typeMap[type] = (typeMap[type] || 0) + payment.amount;
      total += payment.amount;
    });

    return {
      total,
      data: Object.entries(typeMap).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total * 100).toFixed(0) : 0
      })).sort((a, b) => b.value - a.value)
    };
  }, [filteredPayments, filteredSessions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{payload[0].payload.fullDate || payload[0].name || label}</p>
          <p className="text-lg font-black text-success">
            ₪{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const rangeOptions = [
    { id: '7d' as TimeRange, label: 'השבוע האחרון' },
    { id: '30d' as TimeRange, label: 'החודש האחרון' },
    { id: 'ytd' as TimeRange, label: 'מתחילת השנה' },
  ];

  return (
    <div className="space-y-6 pb-24 transition-colors duration-300">
      <div className="sticky top-0 z-30 pt-4 pb-2 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md -mx-4 px-4 transition-colors duration-300">
        <div className="flex flex-col gap-4">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white px-1">דוחות</h3>
          
          {/* Segmented Control */}
          <div className="relative bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center self-center w-full max-w-md">
            {/* Sliding Highlight */}
            <div 
              className="absolute h-[calc(100%-8px)] bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-out z-0"
              style={{ 
                width: `calc((100% - 8px) / 3)`,
                transform: `translateX(calc(${rangeOptions.findIndex(o => o.id === timeRange) * -100}%))`
              }}
            />
            {rangeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTimeRange(option.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors duration-300 relative z-10 ${
                  timeRange === option.id 
                    ? 'text-slate-900 dark:text-white' 
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-container shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300">
        <div className="mb-8 text-center sm:text-right">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
            {timeRange === '7d' ? 'הכנסות ב-7 ימים האחרונים' : 'הכנסות ב-30 ימים האחרונים'}
          </h4>
          <p className="text-xs text-slate-400 font-medium">סיכום יומי של תקבולים</p>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                dy={10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.4 }} />
              <Bar dataKey="income" radius={[6, 6, 0, 0]} barSize={timeRange === '7d' ? 32 : 12}>
                {dailyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#10b981" fillOpacity={entry.income === 0 ? 0.1 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Type Donut Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-container shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300">
        <div className="mb-8 text-center sm:text-right">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">פילוח הכנסות לפי סוג</h4>
          <p className="text-xs text-slate-400 font-medium">חלוקה יחסית של סך ההכנסות לתקופה</p>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData.data.length > 0 ? typeData.data : [{ name: "אין נתונים", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.data.length > 0 ? (
                    typeData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))
                  ) : (
                    <Cell fill="#e2e8f0" stroke="none" />
                  )}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">סה"כ הכנסות</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">₪{typeData.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full mt-6 grid grid-cols-2 gap-3">
            {typeData.data.length > 0 ? (
              typeData.data.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{entry.name}</span>
                    <span className="text-[10px] font-medium text-slate-400">{entry.percentage}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-2 text-center text-sm text-slate-400 font-medium">אין נתוני טיפולים לתקופה זו</p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-container shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300">
        <div className="mb-8 text-center sm:text-right">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
            {timeRange === 'ytd' ? 'סיכום שנתי מתחילת השנה' : 'סיכום תקופתי'}
          </h4>
          <p className="text-xs text-slate-400 font-medium">הכנסות מצטברות לפי חודש</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} dy={10} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
