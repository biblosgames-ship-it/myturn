import React, { useState, useRef } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, DollarSign, Landmark, 
  FileText, Image as ImageIcon, Printer, Share2, Calendar, Plus, X, 
  ArrowDownRight, ArrowUpRight, HelpCircle, BookOpen, PieChart, 
  ShoppingBag, Scissors, Download, Users, Tag, Sparkles
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';
import { DebtsManagement } from './DebtsManagement';

export interface Transaction {
  id: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  subtotal?: number;
  discountPercent?: number;
  method: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  category: string;
  description: string;
  date: string;
  staffId?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  commission: number;
  imageUrl?: string;
}

interface FinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  staff: StaffMember[];
  businessName: string;
  logoUrl: string;
  filteredApts: any[];
  filterType: 'day' | 'week' | 'month' | 'year' | 'range';
  filterValue: string;
  tenantId?: string;
  dbServices?: any[];
}

export const FinanceManagement: React.FC<FinanceProps> = ({ 
  transactions, 
  setTransactions, 
  staff, 
  businessName, 
  logoUrl,
  filteredApts,
  filterType,
  filterValue,
  tenantId,
  dbServices = []
}) => {
  const [subTab, setSubTab] = useState<'report' | 'overview' | 'debts'>('report');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReport, setShowReport] = useState<'none' | 'pdf' | 'img' | 'cierre'>('none');
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'ingreso', method: 'efectivo', amount: 0, category: 'Varios', description: '', staffId: '' });
  const reportRef = useRef<HTMLDivElement>(null);

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'ingreso') {
      acc.income += t.amount;
      acc.discounts += (t.subtotal || t.amount) - t.amount;
      const m = t.method as keyof typeof acc;
      if (m in acc) (acc as any)[m] += t.amount;
      else acc.otro += t.amount;
    } else {
      acc.expense += t.amount;
    }
    return acc;
  }, { income: 0, expense: 0, efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0, otro: 0, discounts: 0 });

  const balance = totals.income - totals.expense;

  // Breakdown by Concept Calculation
  const conceptBreakdown = (() => {
    const servicesMap: Record<string, { count: number; total: number }> = {};
    const productsMap: Record<string, { count: number; total: number }> = {};
    const otherIncomesMap: Record<string, { count: number; total: number }> = {};

    let totalServicesIncome = 0;
    let totalServicesCount = 0;
    let totalProductsIncome = 0;
    let totalProductsCount = 0;
    let totalOtherIncome = 0;
    let totalOtherCount = 0;

    const incomeTxs = transactions.filter(t => t.type === 'ingreso');

    incomeTxs.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').trim();

      const isStoreSale = cat.includes('tienda') || desc.toLowerCase().startsWith('venta mostrador');

      if (isStoreSale) {
        // Parse items e.g. "Venta Mostrador: Pomada Mate (x1), Cera (x2)"
        const itemMatches = [...desc.matchAll(/([^,:|]+?)\s*\(x?(\d+)\)/g)];
        if (itemMatches.length > 0) {
          const totalUnitsInTx = itemMatches.reduce((s, m) => s + (parseInt(m[2], 10) || 1), 0);
          itemMatches.forEach(m => {
            const rawName = m[1].replace(/^Venta Mostrador:\s*/i, '').trim();
            const qty = parseInt(m[2], 10) || 1;
            const itemTotal = totalUnitsInTx > 0 ? (t.amount * (qty / totalUnitsInTx)) : t.amount;
            if (!productsMap[rawName]) productsMap[rawName] = { count: 0, total: 0 };
            productsMap[rawName].count += qty;
            productsMap[rawName].total += itemTotal;
            totalProductsCount += qty;
          });
        } else {
          const fallbackName = desc.replace(/^Venta Mostrador:\s*/i, '').trim() || t.category || 'Producto de Tienda';
          if (!productsMap[fallbackName]) productsMap[fallbackName] = { count: 0, total: 0 };
          productsMap[fallbackName].count += 1;
          productsMap[fallbackName].total += t.amount;
          totalProductsCount += 1;
        }
        totalProductsIncome += t.amount;
      } else if (cat.includes('varios') || cat.includes('propina') || cat.includes('ajuste') || cat.includes('otro')) {
        const otherName = t.category || 'Otros Ingresos';
        if (!otherIncomesMap[otherName]) otherIncomesMap[otherName] = { count: 0, total: 0 };
        otherIncomesMap[otherName].count += 1;
        otherIncomesMap[otherName].total += t.amount;
        totalOtherCount += 1;
        totalOtherIncome += t.amount;
      } else {
        // Services transaction
        if (desc.includes('| Productos:')) {
          const parts = desc.split('| Productos:');
          const productsPart = parts[1] || '';
          const productMatches = [...productsPart.matchAll(/([^,:|]+?)\s*\(x?(\d+)\)/g)];
          productMatches.forEach(m => {
            const rawName = m[1].trim();
            const qty = parseInt(m[2], 10) || 1;
            if (!productsMap[rawName]) productsMap[rawName] = { count: 0, total: 0 };
            productsMap[rawName].count += qty;
            totalProductsCount += qty;
          });
        }

        const serviceName = t.category.replace(/\s*\+\s*Productos/i, '').trim() || 'Servicio General';
        if (!servicesMap[serviceName]) servicesMap[serviceName] = { count: 0, total: 0 };
        servicesMap[serviceName].count += 1;
        servicesMap[serviceName].total += t.amount;
        totalServicesCount += 1;
        totalServicesIncome += t.amount;
      }
    });

    const servicesList = Object.entries(servicesMap)
      .map(([name, val]) => ({
        name,
        count: val.count,
        total: val.total,
        avgPrice: val.count > 0 ? val.total / val.count : 0,
        percent: totalServicesIncome > 0 ? (val.total / totalServicesIncome) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    const productsList = Object.entries(productsMap)
      .map(([name, val]) => ({
        name,
        count: val.count,
        total: val.total,
        avgPrice: val.count > 0 ? val.total / val.count : 0,
        percent: totalProductsIncome > 0 ? (val.total / totalProductsIncome) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    const otherList = Object.entries(otherIncomesMap)
      .map(([name, val]) => ({
        name,
        count: val.count,
        total: val.total,
        percent: totalOtherIncome > 0 ? (val.total / totalOtherIncome) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    const methodsList = [
      { name: 'Efectivo', key: 'efectivo', amount: totals.efectivo, count: incomeTxs.filter(t => t.method === 'efectivo').length },
      { name: 'Tarjeta / Datáfono', key: 'tarjeta', amount: totals.tarjeta, count: incomeTxs.filter(t => t.method === 'tarjeta').length },
      { name: 'Transferencia / QR', key: 'transferencia', amount: totals.transferencia, count: incomeTxs.filter(t => t.method === 'transferencia').length },
      { name: 'Crédito / Fiado', key: 'credito', amount: totals.credito, count: incomeTxs.filter(t => t.method === 'credito').length },
      { name: 'Otro', key: 'otro', amount: totals.otro, count: incomeTxs.filter(t => !['efectivo', 'tarjeta', 'transferencia', 'credito'].includes(t.method)).length }
    ].filter(m => m.amount > 0 || m.count > 0).map(m => ({
      ...m,
      percent: totals.income > 0 ? (m.amount / totals.income) * 100 : 0
    }));

    const staffList = staff.map(st => {
      const stTxs = incomeTxs.filter(t => t.staffId === st.id);
      const stApts = filteredApts.filter(a => a.staffId === st.id);
      const totalAmount = stTxs.reduce((s, t) => s + t.amount, 0);
      const commissionRate = st.commission || 0;
      const commissionEarned = (totalAmount * commissionRate) / 100;
      return {
        id: st.id,
        name: st.name,
        role: st.role,
        serviceCount: Math.max(stTxs.length, stApts.length),
        totalGenerated: totalAmount,
        commissionRate,
        commissionEarned
      };
    }).filter(st => st.totalGenerated > 0 || st.serviceCount > 0)
      .sort((a, b) => b.totalGenerated - a.totalGenerated);

    return {
      servicesList,
      productsList,
      otherList,
      methodsList,
      staffList,
      totalServicesIncome,
      totalServicesCount,
      totalProductsIncome,
      totalProductsCount,
      totalOtherIncome,
      totalOtherCount,
      totalDiscounts: totals.discounts,
      grossIncome: totals.income,
      totalExpenses: totals.expense,
      netProfit: totals.income - totals.expense
    };
  })();

  const downloadConceptReportCSV = () => {
    let csv = `REPORTE CONSOLIDADO POR CONCEPTO - ${businessName.toUpperCase()}\n`;
    csv += `Periodo: ${filterType.toUpperCase()} (${filterValue}) - Generado: ${new Date().toLocaleString()}\n\n`;

    csv += `RESUMEN GENERAL\n`;
    csv += `Concepto,Total Monto\n`;
    csv += `Ingresos por Servicios,$${conceptBreakdown.totalServicesIncome.toFixed(2)}\n`;
    csv += `Ingresos por Tienda / Productos,$${conceptBreakdown.totalProductsIncome.toFixed(2)}\n`;
    csv += `Otros Ingresos,$${conceptBreakdown.totalOtherIncome.toFixed(2)}\n`;
    csv += `Descuentos Aplicados,-$${conceptBreakdown.totalDiscounts.toFixed(2)}\n`;
    csv += `TOTAL INGRESOS BRUTOS,$${conceptBreakdown.grossIncome.toFixed(2)}\n`;
    csv += `GASTOS OPERATIVOS,-$${conceptBreakdown.totalExpenses.toFixed(2)}\n`;
    csv += `UTILIDAD NETA,$${conceptBreakdown.netProfit.toFixed(2)}\n\n`;

    csv += `DESGLOSE POR SERVICIOS\n`;
    csv += `Servicio,Cantidad,Subtotal ($),Precio Promedio ($),% Participacion\n`;
    conceptBreakdown.servicesList.forEach(s => {
      csv += `"${s.name}",${s.count},$${s.total.toFixed(2)},$${s.avgPrice.toFixed(2)},${s.percent.toFixed(1)}%\n`;
    });
    csv += `\n`;

    csv += `DESGLOSE POR TIENDA / PRODUCTOS\n`;
    csv += `Producto,Unidades Vendidas,Subtotal ($),Precio Promedio ($),% Participacion\n`;
    conceptBreakdown.productsList.forEach(p => {
      csv += `"${p.name}",${p.count},$${p.total.toFixed(2)},$${p.avgPrice.toFixed(2)},${p.percent.toFixed(1)}%\n`;
    });
    csv += `\n`;

    csv += `DESGLOSE POR METODOS DE PAGO\n`;
    csv += `Metodo,Transacciones,Total ($),% Participacion\n`;
    conceptBreakdown.methodsList.forEach(m => {
      csv += `"${m.name}",${m.count},$${m.amount.toFixed(2)},${m.percent.toFixed(1)}%\n`;
    });
    csv += `\n`;

    csv += `DESGLOSE POR PROFESIONAL / EQUIPO\n`;
    csv += `Profesional,Rol,Citas/Servicios,Facturado ($),Comision (%),Comision Ganada ($)\n`;
    conceptBreakdown.staffList.forEach(st => {
      csv += `"${st.name}","${st.role}",${st.serviceCount},$${st.totalGenerated.toFixed(2)},${st.commissionRate}%,$${st.commissionEarned.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Reporte_Consolidado_${businessName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintConceptReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte Consolidado por Concepto - ${businessName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #111; max-width: 800px; margin: 0 auto; }
            h1, h2, h3, h4 { margin: 0 0 8px 0; }
            .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 24px; }
            .header img { max-height: 60px; margin-bottom: 8px; }
            .meta { font-size: 0.85rem; color: #555; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
            .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 6px; background: #fafafa; }
            .summary-card .label { font-size: 0.7rem; color: #666; text-transform: uppercase; font-weight: bold; }
            .summary-card .value { font-size: 1.3rem; font-weight: 800; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 0.85rem; }
            th { background: #f0f0f0; text-align: left; padding: 8px; border-bottom: 2px solid #ccc; font-size: 0.75rem; text-transform: uppercase; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background: #f9f9f9; border-top: 2px solid #333; }
            .footer { margin-top: 40px; text-align: center; font-size: 0.75rem; color: #777; border-top: 1px solid #ddd; padding-top: 16px; }
            .signature-box { display: flex; justify-content: space-around; margin-top: 40px; }
            .signature-line { border-top: 1px solid #333; width: 180px; text-align: center; font-size: 0.75rem; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${businessName}" />` : ''}
            <h1>${businessName}</h1>
            <h2>REPORTE CONSOLIDADO POR CONCEPTO</h2>
            <div class="meta">Periodo: ${filterType.toUpperCase()} (${filterValue}) | Emitido: ${new Date().toLocaleString()}</div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Ingresos por Servicios</div>
              <div class="value" style="color: #2563eb;">$${conceptBreakdown.totalServicesIncome.toFixed(2)}</div>
              <div style="font-size: 0.75rem; color: #666;">${conceptBreakdown.totalServicesCount} servicios realizados</div>
            </div>
            <div class="summary-card">
              <div class="label">Ingresos por Tienda</div>
              <div class="value" style="color: #10b981;">$${conceptBreakdown.totalProductsIncome.toFixed(2)}</div>
              <div style="font-size: 0.75rem; color: #666;">${conceptBreakdown.totalProductsCount} unidades vendidas</div>
            </div>
            <div class="summary-card">
              <div class="label">Utilidad Neta Periodo</div>
              <div class="value" style="color: ${conceptBreakdown.netProfit >= 0 ? '#10b981' : '#ef4444'};">$${conceptBreakdown.netProfit.toFixed(2)}</div>
              <div style="font-size: 0.75rem; color: #666;">Bruto $${conceptBreakdown.grossIncome.toFixed(2)} - Gastos $${conceptBreakdown.totalExpenses.toFixed(2)}</div>
            </div>
          </div>

          <h3>1. Desglose de Servicios Realizados</h3>
          <table>
            <thead>
              <tr>
                <th>Servicio / Concepto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Subtotal ($)</th>
                <th class="text-right">Ticket Prom.</th>
                <th class="text-right">% Participación</th>
              </tr>
            </thead>
            <tbody>
              ${conceptBreakdown.servicesList.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td class="text-right">${s.count}</td>
                  <td class="text-right">$${s.total.toFixed(2)}</td>
                  <td class="text-right">$${s.avgPrice.toFixed(2)}</td>
                  <td class="text-right">${s.percent.toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>TOTAL SERVICIOS</td>
                <td class="text-right">${conceptBreakdown.totalServicesCount}</td>
                <td class="text-right">$${conceptBreakdown.totalServicesIncome.toFixed(2)}</td>
                <td class="text-right">-</td>
                <td class="text-right">100%</td>
              </tr>
            </tbody>
          </table>

          <h3>2. Desglose de Ventas de Tienda (Productos)</h3>
          <table>
            <thead>
              <tr>
                <th>Producto / Concepto</th>
                <th class="text-right">Unidades</th>
                <th class="text-right">Subtotal ($)</th>
                <th class="text-right">% Participación</th>
              </tr>
            </thead>
            <tbody>
              ${conceptBreakdown.productsList.length > 0 ? conceptBreakdown.productsList.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-right">${p.count}</td>
                  <td class="text-right">$${p.total.toFixed(2)}</td>
                  <td class="text-right">${p.percent.toFixed(1)}%</td>
                </tr>
              `).join('') : `<tr><td colspan="4" style="text-align:center; color:#888;">Sin ventas de tienda en este periodo</td></tr>`}
              <tr class="total-row">
                <td>TOTAL TIENDA</td>
                <td class="text-right">${conceptBreakdown.totalProductsCount}</td>
                <td class="text-right">$${conceptBreakdown.totalProductsIncome.toFixed(2)}</td>
                <td class="text-right">100%</td>
              </tr>
            </tbody>
          </table>

          <h3>3. Métodos de Pago</h3>
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th class="text-right">Transacciones</th>
                <th class="text-right">Total ($)</th>
                <th class="text-right">% Total</th>
              </tr>
            </thead>
            <tbody>
              ${conceptBreakdown.methodsList.map(m => `
                <tr>
                  <td>${m.name}</td>
                  <td class="text-right">${m.count}</td>
                  <td class="text-right">$${m.amount.toFixed(2)}</td>
                  <td class="text-right">${m.percent.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${conceptBreakdown.staffList.length > 0 ? `
            <h3>4. Rendimiento por Profesional / Colaborador</h3>
            <table>
              <thead>
                <tr>
                  <th>Profesional</th>
                  <th>Rol</th>
                  <th class="text-right">Atenciones</th>
                  <th class="text-right">Total Facturado</th>
                  <th class="text-right">Comisión Estimada</th>
                </tr>
              </thead>
              <tbody>
                ${conceptBreakdown.staffList.map(st => `
                  <tr>
                    <td><strong>${st.name}</strong></td>
                    <td>${st.role}</td>
                    <td class="text-right">${st.serviceCount}</td>
                    <td class="text-right">$${st.totalGenerated.toFixed(2)}</td>
                    <td class="text-right">$${st.commissionEarned.toFixed(2)} (${st.commissionRate}%)</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="signature-box">
            <div class="signature-line">Administrador / Gerente</div>
            <div class="signature-line">Caja / Finanzas</div>
          </div>

          <div class="footer">
            <p>Generado automáticamente por MyTurn SaaS • Sistema de Gestión y Fidelización Inteligente</p>
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateClosureHTML = () => {
    return `
      <div style="padding: 40px; background: white; color: black; font-family: sans-serif; width: 100%; max-width: 400px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          ${logoUrl ? `<img src="${logoUrl}" style="height: 50px; margin-bottom: 10px;" />` : `<h2 style="margin:0">${businessName}</h2>`}
          <div style="font-weight: 900; border-top: 1px solid black; border-bottom: 1px solid black; margin: 10px 0; padding: 5px 0;">REPORTE DE CIERRE</div>
          <div style="font-size: 0.8rem;">${new Date().toLocaleString()}</div>
        </div>

        <div style="border-bottom: 1px dashed black; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between;"><span>Ingresos:</span> <strong>$${totals.income.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span>Gastos:</span> <strong>-$${totals.expense.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-top: 5px; border-top: 1px solid black; padding-top: 5px;">
            <span style="font-weight: 900;">TOTAL CAJA:</span> <strong style="font-size: 1.2rem;">$${balance.toFixed(2)}</strong>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: 900; font-size: 0.8rem; text-transform: uppercase;">Métodos de Pago</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;"><span>Efectivo:</span> <span>$${totals.efectivo.toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;"><span>Tarjeta:</span> <span>$${totals.tarjeta.toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;"><span>Depósitos:</span> <span>$${totals.transferencia.toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;"><span>Fiado/Crédito:</span> <span>$${totals.credito.toFixed(2)}</span></div>
        </div>

        <div style="text-align: center; border-top: 1px solid black; padding-top: 20px;">
          <div style="height: 40px; border-bottom: 1px solid black; width: 150px; margin: 0 auto 10px;"></div>
          <div style="font-weight: 800; font-size: 0.8rem;">FIRMA AUTORIZADA</div>
          <p style="font-size: 0.7rem; margin-top: 20px;">Generado por MyTurn SaaS</p>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Cierre de Caja - ${businessName}</title>
          <style>
            @media print { body { -webkit-print-color-adjust: exact; margin: 0; } }
          </style>
        </head>
        <body onload="window.print();window.close();">
          ${generateClosureHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const { labels, incomeValues } = (() => {
    let labels: string[] = [];
    let incomeValues: number[] = [];

    if (filterType === 'day' || filterType === 'week') {
      if (filterType === 'day') {
        labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
        labels.forEach(hour => {
          const h = parseInt(hour);
          const nextH = h + 2;
          const income = transactions.filter(t => {
            const tDate = new Date(t.date);
            const isTargetDay = tDate.toISOString().split('T')[0] === filterValue;
            return t.type === 'ingreso' && isTargetDay && tDate.getHours() >= h && tDate.getHours() < nextH;
          }).reduce((s, t) => s + t.amount, 0);
          incomeValues.push(income);
        });
      } else {
        labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const days = [1, 2, 3, 4, 5, 6, 0];
        days.forEach(d => {
          const income = transactions.filter(t => t.type === 'ingreso' && new Date(t.date).getDay() === d).reduce((s, t) => s + t.amount, 0);
          incomeValues.push(income);
        });
      }
    } else if (filterType === 'month') {
      labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      [1, 8, 16, 24].forEach((startDay, i) => {
        const endDay = i === 3 ? 31 : startDay + 7;
        const income = transactions.filter(t => t.type === 'ingreso' && new Date(t.date).getDate() >= startDay && new Date(t.date).getDate() < endDay).reduce((s, t) => s + t.amount, 0);
        incomeValues.push(income);
      });
    } else if (filterType === 'year') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      labels.forEach((_, i) => {
        const income = transactions.filter(t => t.type === 'ingreso' && new Date(t.date).getMonth() === i).reduce((s, t) => s + t.amount, 0);
        incomeValues.push(income);
      });
    }
    return { labels, incomeValues };
  })();

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_${businessName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Error al generar PDF. Intenta con Imprimir.");
    }
  };

  const totalsByStaff = transactions.reduce((acc, t) => {
    if (t.type === 'ingreso' && t.staffId) {
      acc[t.staffId] = (acc[t.staffId] || 0) + t.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const [isSaving, setIsSaving] = useState(false);

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;
    setIsSaving(true);

    try {
      const dbPayload: any = {
        amount: Number(newTx.amount),
        type: newTx.type,
        payment_method: newTx.method,
        category: newTx.category || 'Varios',
        description: newTx.description,
        staff_id: newTx.staffId || null
      };
      if (tenantId) dbPayload.tenant_id = tenantId;

      let { data, error } = await supabase.from('transactions').insert(dbPayload).select().single();

      if (error && error.message && (error.message.toLowerCase().includes('column') || error.message.includes('schema cache'))) {
        console.warn("Retrying transaction insert with notes fallback due to:", error.message);
        const fallbackPayload: any = {
          amount: Number(newTx.amount),
          type: newTx.type,
          payment_method: newTx.method,
          category: newTx.category || 'Varios',
          notes: newTx.description,
          staff_id: newTx.staffId || null
        };
        if (tenantId) fallbackPayload.tenant_id = tenantId;
        const retry = await supabase.from('transactions').insert(fallbackPayload).select().single();
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      }

      if (data && !error) {
        const tx: Transaction = {
          id: data.id,
          type: data.type as any,
          amount: data.amount,
          method: data.payment_method as any,
          category: data.category || 'Varios',
          description: data.description || data.notes || newTx.description || 'Transacción',
          date: data.created_at,
          staffId: data.staff_id || undefined
        };

        setTransactions([tx, ...transactions]);
        setShowAddModal(false);
        setNewTx({ type: 'ingreso', method: 'efectivo', amount: 0, category: 'Varios', description: '', staffId: '' });
      } else {
        console.error(error);
        alert('Error al guardar la transacción. Revisa tu conexión.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setSubTab('report')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: subTab === 'report' ? 'var(--primary)' : 'transparent',
              color: subTab === 'report' ? 'black' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              textTransform: 'uppercase'
            }}
          >
            <PieChart size={16} /> Reporte por Concepto
          </button>
          <button
            onClick={() => setSubTab('overview')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: subTab === 'overview' ? 'var(--primary)' : 'transparent',
              color: subTab === 'overview' ? 'black' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              textTransform: 'uppercase'
            }}
          >
            <Wallet size={16} /> Flujo de Caja & Métricas
          </button>
          <button
            onClick={() => setSubTab('debts')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: subTab === 'debts' ? '#f59e0b' : 'transparent',
              color: subTab === 'debts' ? 'black' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              textTransform: 'uppercase'
            }}
          >
            <BookOpen size={16} /> Libreta de Fiados (Cuentas por Cobrar)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {subTab === 'report' && (
            <>
              <button 
                onClick={downloadConceptReportCSV} 
                className="btn btn-outline" 
                style={{ display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Download size={16} /> CSV
              </button>
              <button 
                onClick={handlePrintConceptReport} 
                className="btn btn-outline" 
                style={{ display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Printer size={16} /> Imprimir Reporte
              </button>
            </>
          )}
          <button className="btn btn-outline" onClick={() => { setNewTx({ ...newTx, type: 'ingreso' }); setShowAddModal(true); }} style={{ display: 'flex', gap: '0.4rem', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: '0.85rem' }}>
            <Plus size={18} /> Nuevo Movimiento
          </button>
          <button className="btn btn-primary" onClick={() => setShowReport('cierre')} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
            <FileText size={18} /> Cierre de Caja
          </button>
        </div>
      </div>

      {subTab === 'debts' ? (
        <DebtsManagement 
          tenantId={tenantId || ''} 
          businessName={businessName} 
          onDebtSettled={(newTx) => setTransactions(prev => [newTx, ...prev])} 
        />
      ) : subTab === 'report' ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header of Concept Report */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                <PieChart size={24} color="var(--primary)" /> Reporte Consolidado por Concepto
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Desglose analítico de entradas por servicios realizados, ventas de tienda, métodos de cobro y equipo.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={downloadConceptReportCSV}
                className="btn btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
              >
                <Download size={16} /> Exportar CSV
              </button>
              <button 
                onClick={handlePrintConceptReport}
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
              >
                <Printer size={16} /> Imprimir / PDF
              </button>
            </div>
          </div>

          {/* Consolidated Executive Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Card 1: Servicios */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: 'rgba(59,130,246,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Servicios Realizados
                </span>
                <Scissors size={18} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>
                ${conceptBreakdown.totalServicesIncome.toFixed(2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{conceptBreakdown.totalServicesCount} servicios</span>
                <span style={{ fontWeight: 700, color: '#3b82f6' }}>
                  {(conceptBreakdown.grossIncome > 0 ? (conceptBreakdown.totalServicesIncome / conceptBreakdown.grossIncome) * 100 : 0).toFixed(0)}% del bruto
                </span>
              </div>
            </div>

            {/* Card 2: Tienda / Productos */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', background: 'rgba(16,185,129,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tienda / Productos
                </span>
                <ShoppingBag size={18} color="var(--success)" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>
                ${conceptBreakdown.totalProductsIncome.toFixed(2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{conceptBreakdown.totalProductsCount} unidades</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {(conceptBreakdown.grossIncome > 0 ? (conceptBreakdown.totalProductsIncome / conceptBreakdown.grossIncome) * 100 : 0).toFixed(0)}% del bruto
                </span>
              </div>
            </div>

            {/* Card 3: Otros Ingresos */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Otros Ingresos
                </span>
                <DollarSign size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>
                ${conceptBreakdown.totalOtherIncome.toFixed(2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{conceptBreakdown.totalOtherCount} movimientos</span>
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                  {(conceptBreakdown.grossIncome > 0 ? (conceptBreakdown.totalOtherIncome / conceptBreakdown.grossIncome) * 100 : 0).toFixed(0)}% del bruto
                </span>
              </div>
            </div>

            {/* Card 4: Total Bruto */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', background: 'rgba(245,158,11,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Ingresos Brutos
                </span>
                <TrendingUp size={18} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>
                ${conceptBreakdown.grossIncome.toFixed(2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Descuentos:</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>-${conceptBreakdown.totalDiscounts.toFixed(2)}</span>
              </div>
            </div>

            {/* Card 5: Gastos Operativos */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444', background: 'rgba(239,68,68,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Gastos Operativos
                </span>
                <TrendingDown size={18} color="#ef4444" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ef4444' }}>
                -${conceptBreakdown.totalExpenses.toFixed(2)}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {transactions.filter(t => t.type === 'egreso').length} registros de egreso
              </div>
            </div>

            {/* Card 6: Utilidad Neta */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${conceptBreakdown.netProfit >= 0 ? 'var(--success)' : '#ef4444'}`, background: conceptBreakdown.netProfit >= 0 ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: conceptBreakdown.netProfit >= 0 ? 'var(--success)' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Utilidad Neta / Caja
                </span>
                <Wallet size={18} color={conceptBreakdown.netProfit >= 0 ? 'var(--success)' : '#ef4444'} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: conceptBreakdown.netProfit >= 0 ? 'var(--success)' : '#ef4444' }}>
                ${conceptBreakdown.netProfit.toFixed(2)}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: conceptBreakdown.netProfit >= 0 ? 'var(--success)' : '#ef4444' }}>
                {conceptBreakdown.netProfit >= 0 ? '✓ Margen Operativo Positivo' : '⚠ Déficit en el Periodo'}
              </div>
            </div>
          </div>

          {/* Breakdown Tables: Services & Store */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {/* Table 1: Breakdown by Service */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Scissors size={20} color="#3b82f6" />
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Desglose por Concepto de Servicios</h4>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Total: ${conceptBreakdown.totalServicesIncome.toFixed(2)}
                </span>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cant.</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subtotal</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Promedio</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>% Part.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conceptBreakdown.servicesList.map(s => (
                      <tr key={s.name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                          <div style={{ width: '100%', maxWidth: '140px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(s.percent, 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '2px' }} />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {s.count}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontWeight: 800, color: '#3b82f6' }}>
                          ${s.total.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          ${s.avgPrice.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {s.percent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    {conceptBreakdown.servicesList.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                          No hay servicios registrados en este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {conceptBreakdown.servicesList.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 800, borderTop: '2px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>TOTAL SERVICIOS</td>
                        <td style={{ textAlign: 'center', padding: '0.85rem 0.5rem' }}>{conceptBreakdown.totalServicesCount}</td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem', color: '#3b82f6' }}>${conceptBreakdown.totalServicesIncome.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem', color: 'var(--text-muted)' }}>
                          ${conceptBreakdown.totalServicesCount > 0 ? (conceptBreakdown.totalServicesIncome / conceptBreakdown.totalServicesCount).toFixed(2) : '0.00'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 1rem' }}>100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Table 2: Breakdown by Store / Products */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShoppingBag size={20} color="var(--success)" />
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Desglose de Ventas de Tienda (Productos)</h4>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Total: ${conceptBreakdown.totalProductsIncome.toFixed(2)}
                </span>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Producto</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unidades</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subtotal</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Promedio</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>% Part.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conceptBreakdown.productsList.map(p => (
                      <tr key={p.name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                          <div style={{ width: '100%', maxWidth: '140px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(p.percent, 100)}%`, height: '100%', background: 'var(--success)', borderRadius: '2px' }} />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {p.count}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontWeight: 800, color: 'var(--success)' }}>
                          ${p.total.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          ${p.avgPrice.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {p.percent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    {conceptBreakdown.productsList.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                          No hay ventas de productos registradas en este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {conceptBreakdown.productsList.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 800, borderTop: '2px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>TOTAL TIENDA</td>
                        <td style={{ textAlign: 'center', padding: '0.85rem 0.5rem' }}>{conceptBreakdown.totalProductsCount}</td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem', color: 'var(--success)' }}>${conceptBreakdown.totalProductsIncome.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 0.75rem', color: 'var(--text-muted)' }}>
                          ${conceptBreakdown.totalProductsCount > 0 ? (conceptBreakdown.totalProductsIncome / conceptBreakdown.totalProductsCount).toFixed(2) : '0.00'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 1rem' }}>100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Row 2: Payment Methods & Staff Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {/* Payment Methods Card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <CreditCard size={20} color="var(--primary)" />
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Desglose por Métodos de Pago</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {conceptBreakdown.methodsList.map(m => (
                  <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.count} cobro{m.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>${m.amount.toFixed(2)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>{m.percent.toFixed(1)}% del total</div>
                    </div>
                  </div>
                ))}
                {conceptBreakdown.methodsList.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', margin: 0 }}>
                    Sin transacciones registradas.
                  </p>
                )}
              </div>
            </div>

            {/* Staff Breakdown Card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.01)' }}>
                <Users size={20} color="var(--primary)" />
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Rendimiento y Comisiones por Profesional</h4>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Colaborador</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Citas</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Facturado</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conceptBreakdown.staffList.map(st => (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 700 }}>{st.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{st.role} • {st.commissionRate}% pactado</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 700 }}>{st.serviceCount}</td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.75rem', fontWeight: 800, color: 'var(--success)' }}>${st.totalGenerated.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--primary)' }}>
                          ${st.commissionEarned.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {conceptBreakdown.staffList.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No hay atenciones vinculadas al equipo en este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet size={24} color="var(--primary)" /> Resumen Financiero
            </h3>
          </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', background: 'rgba(16,185,129,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ingresos Reales</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>${totals.income.toFixed(2)}</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7', background: 'rgba(168,85,247,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Por Transferencia</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>${totals.transferencia.toFixed(2)}</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)', background: 'rgba(239,68,68,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gastos Totales</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>${totals.expense.toFixed(2)}</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${balance >= 0 ? 'var(--primary)' : 'var(--accent)'}`, background: 'rgba(245,158,11,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Balance Neto</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: balance >= 0 ? 'var(--primary)' : 'var(--accent)' }}>
              ${balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--primary)" /> Comportamiento de Ingresos ({filterType.toUpperCase()})
            </h4>
          </div>
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '0.75rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            {labels.map((lbl, i) => {
              const maxVal = Math.max(...incomeValues, 100);
              const heightPct = (incomeValues[i] / maxVal) * 100;
              return (
                <div key={lbl} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>${incomeValues[i]}</div>
                  <div style={{ width: '100%', maxWidth: '24px', height: `${Math.max(heightPct, 5)}%`, background: 'var(--primary)', borderRadius: '4px 4px 0 0', opacity: incomeValues[i] > 0 ? 1 : 0.2 }}></div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{lbl}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} color="var(--primary)" /> Métodos de Pago
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Efectivo', val: totals.efectivo, color: 'var(--success)' },
              { label: 'Tarjeta', val: totals.tarjeta, color: 'var(--primary)' },
              { label: 'Transferencia', val: totals.transferencia, color: '#a855f7' },
              { label: 'Crédito / Fiado', val: totals.credito, color: '#f59e0b' },
              { label: 'Otros', val: totals.otro, color: 'var(--text-muted)' }
            ].map(m => {
              const pct = totals.income > 0 ? (m.val / totals.income) * 100 : 0;
              return (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span>{m.label}</span>
                    <span>${m.val.toFixed(2)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: '3px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>Movimientos Recientes ({transactions.length})</h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {transactions.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.875rem', background: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.35rem', borderRadius: '4px', background: t.type === 'ingreso' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: t.type === 'ingreso' ? 'var(--success)' : 'var(--accent)' }}>
                  {t.type === 'ingreso' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.description}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.category} • {(t.method || '').toUpperCase()} • {new Date(t.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: t.type === 'ingreso' ? 'var(--success)' : 'var(--accent)' }}>
                {t.type === 'ingreso' ? '+' : '-'}${t.amount.toFixed(2)}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No hay transacciones registradas en este periodo.</p>
          )}
        </div>
      </div>
      </>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={addTransaction} className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registrar Movimiento</h3>
              <button onClick={() => setShowAddModal(false)} type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--background)', padding: '0.4rem', borderRadius: 'var(--radius-md)' }}>
              <button 
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'ingreso' })}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', background: newTx.type === 'ingreso' ? 'var(--success)' : 'transparent', color: newTx.type === 'ingreso' ? 'white' : 'var(--text)', fontWeight: 700, cursor: 'pointer' }}
              >Ingreso</button>
              <button 
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'egreso' })}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', background: newTx.type === 'egreso' ? 'var(--accent)' : 'transparent', color: newTx.type === 'egreso' ? 'white' : 'var(--text)', fontWeight: 700, cursor: 'pointer' }}
              >Egreso (Gasto)</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>MONTO ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  value={newTx.amount || ''}
                  onChange={e => setNewTx({ ...newTx, amount: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>MÉTODO DE PAGO</label>
                <select 
                  value={newTx.method} 
                  onChange={e => setNewTx({ ...newTx, method: e.target.value as any })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta de Débito / Crédito</option>
                  <option value="transferencia">Transferencia Bancaria / QR</option>
                  <option value="credito">Crédito / Fiado</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>CATEGORÍA</label>
                <input 
                  type="text" 
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Ej: Insumos, Alquiler, Propinas..."
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>DESCRIPCIÓN / NOTAS</label>
                <input 
                  type="text" 
                  required
                  value={newTx.description}
                  onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Ej: Pago de luz, Compra de café..."
                />
              </div>

              {newTx.type === 'ingreso' && staff && staff.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>¿QUIÉN REALIZÓ EL SERVICIO?</label>
                  <select 
                    value={newTx.staffId || ''}
                    onChange={e => setNewTx({ ...newTx, staffId: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">-- Sin Asignar / Dueño --</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}>
              {isSaving ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </form>
        </div>
      )}

      {showReport !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'white', color: 'black', padding: '2rem', position: 'relative' }}>
            <button 
              className="no-print"
              onClick={() => setShowReport('none')} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#eee', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
            >
              <X size={20} />
            </button>
            <div className="print-only" ref={reportRef} style={{ padding: '40px', background: 'white', color: 'black' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} style={{ height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                ) : (
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{businessName}</div>
                )}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'black', margin: '0' }}>{businessName}</h3>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, borderTop: '1px solid black', borderBottom: '1px solid black', margin: '0.5rem 0', padding: '2px 0' }}>REPORTE DE CIERRE</div>
                <div style={{ fontSize: '0.7rem', color: 'black' }}>{new Date().toLocaleString()}</div>
              </div>

              <div style={{ borderBottom: '1px dashed black', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Ingresos Totales:</span>
                  <strong>${totals.income.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Gastos Operativos:</span>
                  <strong style={{ color: '#ef4444' }}>-${totals.expense.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid black', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                  <span style={{ fontWeight: 900 }}>TOTAL CAJA:</span>
                  <strong style={{ fontSize: '1.1rem' }}>${balance.toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>MÉTODOS DE PAGO</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Efectivo:</span> <span>${totals.efectivo.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tarjeta:</span> <span>${totals.tarjeta.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Depósitos / QR:</span> <span>${totals.transferencia.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Crédito / Fiado:</span> <span>${totals.credito.toFixed(2)}</span></div>
              </div>

              <div style={{ textAlign: 'center', borderTop: '1px solid black', paddingTop: '1.5rem', marginTop: '1rem' }}>
                <div style={{ height: '30px', borderBottom: '1px solid black', width: '140px', margin: '0 auto 8px' }}></div>
                <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>FIRMA AUTORIZADA</div>
              </div>
            </div>

            <div className="no-print" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                <button 
                  className="btn" 
                  style={{ 
                    background: '#000000', 
                    color: '#ffffff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    fontWeight: '800', 
                    padding: '1rem', 
                    border: '3px solid #000000', 
                    borderRadius: '8px', 
                    cursor: 'pointer' 
                  }} 
                  onClick={handlePrint}
                >
                  <Printer size={18} /> IMPRIMIR
                </button>
              </div>
              
              <button 
                className="btn" 
                style={{ 
                  width: '100%', 
                  background: '#f3f4f6', 
                  color: '#000000', 
                  border: '1px solid #ccc', 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  fontWeight: '700' 
                }} 
                onClick={handleDownloadPDF}
              >
                <FileText size={18} /> Descargar PDF (Carpeta)
              </button>
            </div>
            
            <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#aaa', marginTop: '1.5rem' }}>
              Generado por MyTurn SaaS - Inteligencia para tu negocio
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
