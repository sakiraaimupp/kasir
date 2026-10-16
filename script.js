document.addEventListener('DOMContentLoaded', () => {
    
    // Selektor Form
    const orderForm = document.getElementById('order-form');
    const orderIdInput = document.getElementById('order-id');
    const cashierNameInput = document.getElementById('cashier-name');
    const customerNameInput = document.getElementById('customer-name');
    const productSelect = document.getElementById('product-select');
    const orderQtyInput = document.getElementById('order-qty');
    const orderStatusSelect = document.getElementById('order-status');
    const orderNotesInput = document.getElementById('order-notes');
    const paymentReceivedInput = document.getElementById('payment-received');
    const changeAmountDisplay = document.getElementById('change-amount');
    
    const btnSubmit = document.getElementById('btn-submit');
    const btnCancel = document.getElementById('btn-cancel');
    const formActionTitle = document.getElementById('form-action-title');
    const orderListTable = document.getElementById('order-list-table');
    
    // Statistik
    const statRevenue = document.getElementById('stat-total-revenue');
    const statOrders = document.getElementById('stat-total-orders');
    const statProcess = document.getElementById('stat-process-orders');
    const statDone = document.getElementById('stat-done-orders');

    // Overlay Struk Belanja
    const receiptOverlay = document.getElementById('receipt-overlay');

    let transactions = JSON.parse(localStorage.getItem('ayraa_orders')) || [];

    // ==========================================================================
    // 1. JAM & TANGGAL
    // ==========================================================================
    function updateClock() {
        const d = new Date();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        document.getElementById('live-clock').innerText = `${hours}:${minutes}:${seconds}`;
        
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        document.getElementById('live-date').innerText = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ==========================================================================
    // 2. HITUNG KEMBALIAN REAL-TIME
    // ==========================================================================
    function calculateChange() {
        const opt = productSelect.options[productSelect.selectedIndex];
        const payAmount = parseInt(paymentReceivedInput.value) || 0;
        
        if (!opt || productSelect.value === "" || payAmount === 0) {
            changeAmountDisplay.innerText = "";
            return;
        }

        const price = parseInt(opt.getAttribute('data-price'));
        const qty = parseInt(orderQtyInput.value) || 1;
        const totalBill = price * qty;
        const change = payAmount - totalBill;

        if (change >= 0) {
            changeAmountDisplay.innerText = "Rp " + change.toLocaleString('id-ID');
            changeAmountDisplay.style.color = "#653927";
        } else {
            changeAmountDisplay.innerText = "";
        }
    }

    paymentReceivedInput.addEventListener('input', calculateChange);
    productSelect.addEventListener('change', calculateChange);
    orderQtyInput.addEventListener('input', calculateChange);

    // ==========================================================================
    // 3. UPDATE STATISTIK DASHBOARD
    // ==========================================================================
    function updateDashboardStats() {
        let rev = 0, proc = 0, done = 0;
        transactions.forEach(item => {
            rev += Number(item.totalPrice);
            if(item.status === 'Diproses') proc++;
            if(item.status === 'Selesai') done++;
        });
        statRevenue.innerText = "Rp " + rev.toLocaleString('id-ID');
        statOrders.innerText = transactions.length;
        statProcess.innerText = proc;
        statDone.innerText = done;
    }

    // ==========================================================================
    // 4. RENDER DATA TABEL
    // ==========================================================================
    function renderTable() {
        orderListTable.innerHTML = '';
        if(transactions.length === 0) {
            orderListTable.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-muted); padding:40px 20px;">Belum ada pesanan hari ini ✨</td></tr>';
            return;
        }

        transactions.forEach((order) => {
            const tr = document.createElement('tr');
            let nBadge = order.notes ? `<br><span class="receipt-item-notes" style="margin-top:6px;">📝 ${order.notes}</span>` : "";
            
            tr.innerHTML = `
                <td><span style="color:var(--color-choc-medium); font-weight:700;">#${order.invoice}</span></td>
                <td><strong>${order.customer}</strong><div class="text-muted" style="font-size: 11px;">Kasir: ${order.cashier}</div></td>
                <td>
                    <strong>${order.product}</strong>
                    <br><small style="color:var(--text-muted)">${order.qty} pcs × Rp ${Number(order.price).toLocaleString('id-ID')}</small>
                    ${nBadge}
                </td>
                <td><strong style="color:var(--color-choc-dark)">Rp ${Number(order.totalPrice).toLocaleString('id-ID')}</strong></td>
                <td><span class="badge ${order.status === 'Diproses' ? 'proses' : 'selesai'}">${order.status}</span></td>
                <td class="text-center" style="white-space: nowrap;">
                    <button type="button" class="btn-action view" onclick="openReceiptModal('${order.id}')" title="Lihat & Cetak Struk">📄</button>
                    <button type="button" class="btn-action edit" onclick="editOrder('${order.id}')" title="Edit Data">✏️</button>
                    <button type="button" class="btn-action delete" onclick="deleteOrder('${order.id}')" title="Hapus Transaksi">🗑️</button>
                </td>
            `;
            orderListTable.appendChild(tr);
        });
    }

    // ==========================================================================
    // 5. SIMPAN / UPDATE DATA
    // ==========================================================================
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = orderIdInput.value;
        const opt = productSelect.options[productSelect.selectedIndex];
        if (!opt) return;

        const price = parseInt(opt.getAttribute('data-price'));
        const qty = parseInt(orderQtyInput.value) || 1;
        const totalPrice = price * qty;
        const pay = parseInt(paymentReceivedInput.value) || 0;

        if (pay - totalPrice < 0) {
            alert("⚠️ Uang pembayaran kurang! Mohon periksa kembali.");
            return;
        }

        let targetId = id;

        if (id) {
            transactions = transactions.map(item => (item.id === id ? {
                ...item, 
                cashier: cashierNameInput.value, 
                customer: customerNameInput.value,
                product: opt.value, 
                qty, 
                price, 
                totalPrice, 
                status: orderStatusSelect.value, 
                notes: orderNotesInput.value, 
                payAmount: pay, 
                changeAmount: (pay - totalPrice)
            } : item));
        } else {
            targetId = Date.now().toString();
            const now = new Date();
            const timeString = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            
            transactions.unshift({
                id: targetId,
                invoice: Math.floor(1000 + Math.random() * 9000),
                cashier: cashierNameInput.value,
                customer: customerNameInput.value,
                product: opt.value,
                qty,
                price,
                totalPrice,
                status: orderStatusSelect.value,
                notes: orderNotesInput.value,
                payAmount: pay,
                changeAmount: (pay - totalPrice),
                date: now.toLocaleDateString('id-ID') + ' ' + timeString
            });
        }

        localStorage.setItem('ayraa_orders', JSON.stringify(transactions));
        
        // ✅ LANGSUNG PERBARUI SEBELUM RESET FORM
        renderTable();
        updateDashboardStats();
        
        resetForm();

        if (orderStatusSelect.value === 'Selesai') {
            setTimeout(() => { 
                openReceiptModal(targetId); 
            }, 150);
        }
    });

    // ==========================================================================
    // 6. EDIT, CANCEL & HAPUS
    // ==========================================================================
    window.editOrder = function(id) {
        const o = transactions.find(i => i.id === id);
        if(!o) return;

        orderIdInput.value = o.id;
        cashierNameInput.value = o.cashier;
        customerNameInput.value = o.customer;
        productSelect.value = o.product;
        orderQtyInput.value = o.qty;
        orderStatusSelect.value = o.status;
        orderNotesInput.value = o.notes || '';
        paymentReceivedInput.value = o.payAmount || '';
        formActionTitle.innerText = "✏️ Edit Pesanan #" + o.invoice;
        btnSubmit.innerHTML = "✨ Perbarui Transaksi";
        btnCancel.style.display = 'inline-flex';
        calculateChange();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteOrder = function(id) {
        if (confirm("Apakah Anda yakin ingin menghapus data arsip transaksi kasir ini secara permanen?")) {
            transactions = transactions.filter(item => item.id !== id);
            localStorage.setItem('ayraa_orders', JSON.stringify(transactions));
            renderTable();
            updateDashboardStats();
            if (orderIdInput.value === id) {
                resetForm();
            }
        }
    };

    function resetForm() {
        orderIdInput.value = '';
        orderForm.reset();
        cashierNameInput.value = "";
        changeAmountDisplay.innerText = "";
        changeAmountDisplay.style.color = "#8d7b74";
        formActionTitle.innerText = "✍️ Pesanan Baru";
        btnSubmit.innerHTML = "🤎 Simpan Transaksi";
        btnCancel.style.display = 'none';
    }

    btnCancel.addEventListener('click', resetForm);

    // ==========================================================================
    // 7. MODAL STRUK
    // ==========================================================================
    window.openReceiptModal = function(id) {
        const order = transactions.find(i => i.id === id);
        if (!order) return;

        document.getElementById('rcp-invoice').textContent = `#${order.invoice}`;
        document.getElementById('rcp-date').textContent = order.date || new Date().toLocaleDateString('id-ID');
        document.getElementById('rcp-cashier').textContent = order.cashier;
        document.getElementById('rcp-customer').textContent = order.customer;
        document.getElementById('rcp-product-name').textContent = order.product;
        document.getElementById('rcp-qty-calc').textContent = `${order.qty} x Rp ${Number(order.price).toLocaleString('id-ID')}`;
        document.getElementById('rcp-total-item-price').textContent = "Rp " + Number(order.totalPrice).toLocaleString('id-ID');
        
        const notesElem = document.getElementById('rcp-notes');
        const notesDivider = document.getElementById('rcp-notes-divider');
        if (order.notes && order.notes.trim() !== '') {
            notesElem.textContent = `Catatan: ${order.notes}`;
            notesElem.style.display = "inline-block";
            if(notesDivider) notesDivider.style.display = "block";
        } else {
            notesElem.style.display = "none";
            if(notesDivider) notesDivider.style.display = "none";
        }
        
        document.getElementById('rcp-total').textContent = "Rp " + Number(order.totalPrice).toLocaleString('id-ID');
        document.getElementById('rcp-paid').textContent = "Rp " + Number(order.payAmount || 0).toLocaleString('id-ID');
        document.getElementById('rcp-change').textContent = "Rp " + Number(order.changeAmount || 0).toLocaleString('id-ID');
        
        receiptOverlay.classList.remove('hidden');
    };

    window.closeReceipt = function() {
        receiptOverlay.classList.add('hidden');
    };

    window.closeReceiptOutside = function(event) {
        if (event.target === receiptOverlay) {
            closeReceipt();
        }
    };

    // ==========================================================================
    // 8. INISIALISASI
    // ==========================================================================
    function init() {
        updateDashboardStats();
        renderTable();
    }
    init();
});