import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function AddPayment({ userId }: { userId: Id<"users"> }) {
  const [formData, setFormData] = useState({
    patientId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "cash",
    notes: "",
  });
  
  const patients = useQuery(api.patients.list, userId ? { userId } : "skip") || [];
  const payments = useQuery(api.payments.list, userId ? { userId } : "skip") || [];
  const createPayment = useMutation(api.payments.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.amount) {
      toast.error("מטופל וסכום הם שדות חובה");
      return;
    }

    try {
      await createPayment({
        userId,
        patientId: formData.patientId as Id<"patients">,
        amount: parseFloat(formData.amount),
        date: formData.date,
        method: formData.method,
        notes: formData.notes || undefined,
      });
      
      setFormData({
        patientId: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        method: "cash",
        notes: "",
      });
      toast.success("התשלום תועד בהצלחה");
    } catch (error) {
      toast.error("תיעוד התשלום נכשל");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Payment Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium mb-4">תיעוד תשלום</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מטופל *
              </label>
              <select
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">בחר מטופל</option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.name} (יתרה: {patient.debt > 0 ? "-" : patient.debt < 0 ? "+" : ""}₪
                    {Math.abs(patient.debt).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סכום *
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">₪</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                אמצעי תשלום
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">מזומן</option>
                <option value="card">כרטיס אשראי</option>
                <option value="transfer">העברה בנקאית</option>
                <option value="check">צ'ק</option>
                <option value="other">אחר</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הערות
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            תעד תשלום
          </button>
        </form>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">תשלומים אחרונים</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מטופל
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  תאריך
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סכום
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  אמצעי
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  הערות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.slice(0, 10).map((payment: any) => (
                <tr key={payment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {payment.patientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {new Date(payment.date).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ₪{payment.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize text-right">
                    {payment.method === "cash" ? "מזומן" : 
                     payment.method === "card" ? "כרטיס אשראי" :
                     payment.method === "transfer" ? "העברה בנקאית" :
                     payment.method === "check" ? "צ'ק" : "אחר"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {payment.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              טרם תועדו תשלומים.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
