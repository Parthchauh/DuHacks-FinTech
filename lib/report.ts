import { Asset, Trade } from "./finance";

export function generateCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row =>
        Object.values(row).map(value => {
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
            return value;
        }).join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function downloadPortfolioReport(holdings: Asset[], totalValue: number) {
    const reportData = holdings.map(h => ({
        Ticker: h.ticker,
        Name: h.name,
        Price: h.price.toFixed(2),
        Balance: h.balance.toFixed(2),
        Allocation_Pct: ((h.balance / totalValue) * 100).toFixed(2),
        Target_Pct: h.target.toFixed(2),
        Shares: (h.balance / h.price).toFixed(4)
    }));

    // Add summary row
    reportData.push({
        Ticker: 'TOTAL',
        Name: 'Portfolio Total',
        Price: '',
        Balance: totalValue.toFixed(2),
        Allocation_Pct: '100.00',
        Target_Pct: '100.00',
        Shares: ''
    });

    generateCSV(reportData, `OptiWealth_Report_${new Date().toISOString().split('T')[0]}`);
}
