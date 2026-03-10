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

export function ReportsPage({ userId }: { userId: Id<"users"> }) {
  const [firstChartView, setFirstChartView] = useState<'7d' | '12m'>('7d');
  const sessions = useQuery(api.sessions.list, { userId }) || [];
  const payments = useQuery(api.payments.list, { userId }) || [];

  const filteredPayments = useMemo(() => {
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    return payments.filter(item => {
      const itemDate = new Date(item.date || (item as any)._creationTime);
      return itemDate >= startDate;
    });
  }, [payments]);

  const filteredSessions = useMemo(() => {
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    return sessions.filter(s => new Date(s.date || (s as any)._creationTime) >= startDate);
  }, [sessions]);

  const parseTreatmentType = (notes?: string) => {
    if (!notes) return "טיפול";
    const typeMatch = notes.match(/סוג טיפול: (.*?)(?: \||$)/);
    return typeMatch ? typeMatch[1] : "טיפול";
  };

  const dailyData = useMemo(() => {
    const data = [];
    const today = new Date();
    const daysToShow = 7;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const dayNames = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
      const dayName = dayNames[date.getDay()];

      const dailyIncome = payments
        .filter(p => {
          if (p.date !== dateStr) return false;
          if (p.isDeleted || p.isWriteOff || p.type === "adjustment" || p.isRevenue === false) return false;
          return true;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      data.push({
        name: dayName,
        income: dailyIncome,
        fullDate: date.toLocaleDateString("he-IL"),
      });
    }
    return data;
  }, [payments]);

  const last12MonthsData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthNames = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
      const monthName = monthNames[month];

      const monthlyIncome = payments
        .filter(p => {
          const pDate = new Date(p.date);
          const sameMonth = pDate.getMonth() === month && pDate.getFullYear() === year;
          if (!sameMonth) return false;
          if (p.isDeleted || p.isWriteOff || p.type === "adjustment" || p.isRevenue === false) return false;
          return true;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      data.push({
        name: monthName,
        income: monthlyIncome,
        fullDate: `${monthName} ${year}`,
      });
    }
    return data;
  }, [payments]);

  const monthlyData = useMemo(() => {
    const data = [];
    const today = new Date();
    const monthsToShow = today.getMonth() + 1;

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthNames = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
      const monthName = monthNames[month];

      const monthlyIncome = payments
        .filter(p => {
          const pDate = new Date(p.date);
          const sameMonth = pDate.getMonth() === month && pDate.getFullYear() === year;
          if (!sameMonth) return false;
          if (p.isDeleted || p.isWriteOff || p.type === "adjustment" || p.isRevenue === false) return false;
          return true;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      data.push({
        name: monthName,
        income: monthlyIncome,
        year: year,
      });
    }
    return data;
  }, [payments]);

  const dateParams = useMemo(() => {
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    return { 
      startDate: startDate.toISOString().split("T")[0] 
    };
  }, []);

  const typeData = useQuery(api.payments.getIncomeByCategory, { 
    userId, 
    ...dateParams 
  }) || { data: [], total: 0 };

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

  return (
    <div className="space-y-6 pb-24 transition-colors duration-300">
      <div className="sticky top-0 z-30 pt-4 pb-2 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md -mx-4 px-4 transition-colors duration-300">
        <div className="flex flex-col gap-4">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white px-1">דוחות</h3>
        </div>
      </div>

      {/* First Chart: Daily or Monthly */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-container shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="text-center sm:text-right">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
              {firstChartView === '7d' ? 'הכנסות ב-7 ימים האחרונים' : 'הכנסות ב-12 חודשים האחרונים'}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {firstChartView === '7d' ? 'סיכום יומי של תקבולים' : 'סיכום חודשי של תקבולים'}
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setFirstChartView('7d')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                firstChartView === '7d' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`}
            >
              7 ימים
            </button>
            <button
              onClick={() => setFirstChartView('12m')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                firstChartView === '12m' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`}
            >
              12 חודשים
            </button>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={firstChartView === '7d' ? dailyData : last12MonthsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                dy={10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.4 }} />
              <Bar 
                dataKey="income" 
                radius={[6, 6, 0, 0]} 
                barSize={firstChartView === '7d' ? 32 : 16}
              >
                {(firstChartView === '7d' ? dailyData : last12MonthsData).map((entry, index) => (
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
          <p className="text-xs text-slate-400 font-medium">חלוקה יחסית של סך ההכנסות מתחילת השנה</p>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData.data.length > 0 ? typeData.data : [{ category: "אין נתונים", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="category"
                >
                  {typeData.data.length > 0 ? (
                    typeData.data.map((entry: any, index: number) => (
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
              typeData.data.map((entry: any, index: number) => (
                <div key={entry.category} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{entry.category}</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {typeData.total > 0 ? Math.round((entry.value / typeData.total) * 100) : 0}%
                    </span>
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
            סיכום שנתי מתחילת השנה
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
