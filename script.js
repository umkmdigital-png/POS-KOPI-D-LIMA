// ==========================================
// 1. KONFIGURASI & STATE
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDZCnFqxHa0CGVFiipxoCAj6UUbdxkCnwwvK89e4ET2xfU4iTlmAgSgh4mF2YM2I4/exec";
const ADMIN = "6285117010280";
const MENUS = [
    {label:"Americano Ice",harga:6000},{label:"Americano Double",harga:8000},
    {label:"Coffee Milk",harga:7000},{label:"Coffee Aren",harga:8000},
    {label:"Coffee Milo",harga:10000},{label:"Coffee Honey",harga:11000},
    {label:"Coffee Latte",harga:10000},{label:"Rimba Signature",harga:11000},
    {label:"Salted Caramel",harga:12000},{label:"Vanilla Latte",harga:12000},
    {label:"Hazelnut Latte",harga:12000},{label:"Fresh Milk",harga:8000},
    {label:"Chocolate",harga:8000},{label:"Strawberry",harga:8000},
    {label:"Manggo",harga:8000},{label:"Thaitea",harga:8000},
    {label:"Taro",harga:8000},{label:"Matcha",harga:9000},{label:"Milo",harga:9000},{label:"Avocado",harga:9000},{label:"Milky Caramel",harga:10000},{label:"Milky Hazelnut",harga:10000},{label:"Milky Vanilla",harga:10000},{label:"Gratis",harga:0}
];

let cart = {};
let sessionOrders = [];
let expenses = []; 
let orderCounter = 0;

// ==========================================
// 2. UTILITY, PROFILE & AUTO-SAVE FUNCTIONS
// ==========================================
const now = () => new Date();
const fmtTime = (d) => d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
const fmtDate = (d) => d.toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric'});
const cleanNum = (v) => parseInt((v || "").toString().replace(/[^0-9]/g, "")) || 0;

function fmtRp(el) {
    const v = el.value.replace(/[^0-9]/g, "");
    el.value = v ? "Rp " + parseInt(v).toLocaleString('id-ID') : "";
}

function hapticFeedback() {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
}

function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div'); t.id = 'toast';
        Object.assign(t.style, {position:'fixed', bottom:'110px', left:'50%', transform:'translateX(-50%)', background:'#1a1a1a', color:'#fff', padding:'10px 20px', borderRadius:'20px', fontSize:'13px', fontWeight:'700', zIndex:'9999', transition:'opacity .4s'});
        document.body.appendChild(t);
    }
    t.innerText = msg; t.style.opacity = '1';
    setTimeout(() => t.style.opacity = '0', 2200);
}

function updateProfile() {
    const nama = document.getElementById('p_nama')?.value || 'Nama Staff';
    const outlet = document.getElementById('p_outlet')?.value || 'Shift belum dipilih';
    document.getElementById('display-name').innerText = nama;
    document.getElementById('display-role').innerText = outlet;
}

function doCheckin() {
    const nama = document.getElementById('p_nama')?.value.trim();
    const outlet = document.getElementById('p_outlet')?.value;

    if (!nama || !outlet) {
        alert("Harap isi Nama dan pilih Outlet sebelum mulai!");
        return;
    }

    localStorage.setItem('rimba_nama', nama);
    localStorage.setItem('rimba_outlet', outlet);

    showToast(`Check-in berhasil: ${nama} @ ${outlet}`);
    calcTotal(); 
    
    const kasirBtn = document.querySelector('.nav-item[onclick*="tab-penjualan"]');
    if (kasirBtn) openTab('tab-penjualan', kasirBtn);
}

// FUNGSI UNTUK MENYIMPAN DATA SEMENTARA (ANTI-RESET)
function saveState() {
    localStorage.setItem('rimba_cart', JSON.stringify(cart));
    localStorage.setItem('rimba_orders', JSON.stringify(sessionOrders));
    localStorage.setItem('rimba_expenses', JSON.stringify(expenses));
    localStorage.setItem('rimba_counter', orderCounter.toString());
    
    localStorage.setItem('rimba_modal', document.getElementById('p_rupiah')?.value || '');
    localStorage.setItem('rimba_cup', document.getElementById('stok_cup')?.value || '');
    localStorage.setItem('rimba_bahan', document.getElementById('stok_bahan')?.value || '');
    localStorage.setItem('rimba_note', document.getElementById('stok_note')?.value || '');
}

// FUNGSI UNTUK MEMUAT DATA SEMENTARA SAAT APLIKASI DIBUKA
function loadState() {
    try {
        const sc = localStorage.getItem('rimba_cart'); if(sc) cart = JSON.parse(sc);
        const so = localStorage.getItem('rimba_orders'); if(so) sessionOrders = JSON.parse(so);
        const se = localStorage.getItem('rimba_expenses'); if(se) expenses = JSON.parse(se);
        const scnt = localStorage.getItem('rimba_counter'); if(scnt) orderCounter = parseInt(scnt) || 0;
    } catch(e) { console.error("Gagal memuat data sebelumnya", e); }
    
    const sm = localStorage.getItem('rimba_modal'); if(sm && document.getElementById('p_rupiah')) document.getElementById('p_rupiah').value = sm;
    const scup = localStorage.getItem('rimba_cup'); if(scup && document.getElementById('stok_cup')) document.getElementById('stok_cup').value = scup;
    const sb = localStorage.getItem('rimba_bahan'); if(sb && document.getElementById('stok_bahan')) document.getElementById('stok_bahan').value = sb;
    const sn = localStorage.getItem('rimba_note'); if(sn && document.getElementById('stok_note')) document.getElementById('stok_note').value = sn;
}

// ==========================================
// 3. CORE LOGIC & PENJUALAN
// ==========================================
function calcTotal() {
    let currentBruto = 0, currentCups = 0;
    for (const k in cart) {
        currentBruto += cart[k].qty * cart[k].harga;
        currentCups += cart[k].qty;
    }

    let omzetTunai = 0, omzetQRIS = 0, omzetOnline = 0, totalCupSesi = 0;

    sessionOrders.forEach(o => {
        totalCupSesi += o.totalCup;
        if (o.payment === 'Tunai') omzetTunai += o.subtotal;
        else if (o.payment === 'QRIS') omzetQRIS += o.subtotal;
        else if (o.payment === 'Online') omzetOnline += o.subtotal;
    });

    const totalJualSesi = omzetTunai + omzetQRIS + omzetOnline;
    const totalKeluar = expenses.reduce((a, b) => a + b.price, 0);
    const modalAwal = cleanNum(document.getElementById('p_rupiah')?.value);

    const setoranTunai = modalAwal + omzetTunai - totalKeluar;

    const updateUI = (id, text, isInput = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isInput || el.tagName === 'INPUT') el.value = text;
        else el.innerText = text;
    };

    updateUI('p_modal_readonly', "Rp " + modalAwal.toLocaleString('id-ID'), true);
    updateUI('p_keluar', "Rp " + totalKeluar.toLocaleString('id-ID'), true);
    
    updateUI('total-omzet-val', "Rp " + totalJualSesi.toLocaleString('id-ID'));
    updateUI('total-tunai-omzet-val', "Rp " + omzetTunai.toLocaleString('id-ID'));
    updateUI('total-qris-val', "Rp " + omzetQRIS.toLocaleString('id-ID'));
    updateUI('total-online-val', "Rp " + omzetOnline.toLocaleString('id-ID'));
    
    updateUI('total-setoran-val', "Rp " + setoranTunai.toLocaleString('id-ID'), true);
}

function renderMenu() {
    const g = document.getElementById('menu-grid');
    if (!g) return;
    g.innerHTML = '';
    MENUS.forEach(m => {
        const qty = cart[m.label] ? cart[m.label].qty : 0;
        const d = document.createElement('div');
        d.className = 'menu-item' + (qty > 0 ? ' has-qty' : '');
        d.innerHTML = `
            ${qty > 0 ? `<span class="qty-badge" style="background:#d32f2f;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-right:8px">${qty}</span>` : ''}
            <div style="flex:1;cursor:pointer" onclick="addItem('${m.label}',${m.harga})">
                <div style="font-weight:700;font-size:13px">${m.label}</div>
                <div style="font-size:12px;color:#888">Rp ${m.harga.toLocaleString('id-ID')}</div>
            </div>
            <div class="menu-controls">
                <button class="btn-mini" onclick="chgQty('${m.label}',-1)">−</button>
                <span style="font-weight:700;min-width:18px;text-align:center;font-size:14px">${qty}</span>
                <button class="btn-mini" onclick="addItem('${m.label}',${m.harga})">+</button>
            </div>`;
        g.appendChild(d);
    });
}

function addItem(label, harga) {
    hapticFeedback();
    if (!cart[label]) cart[label] = { qty: 0, harga };
    cart[label].qty++;
    updateAll();
}

function chgQty(name, delta) {
    hapticFeedback();
    if (!cart[name]) return;
    cart[name].qty += delta;
    if (cart[name].qty <= 0) delete cart[name];
    updateAll();
}

function confirmOrder() {
    if (Object.keys(cart).length === 0) return alert("Keranjang kosong!");
    
    const custInput = document.getElementById('cart-customer-name');
    const paymentInput = document.getElementById('cart-payment');
    const custName = custInput.value.trim() || "Pelanggan"; 
    const paymentMethod = paymentInput.value || "Tunai";
    
    orderCounter++;
    let sub = 0, cups = 0, items = [];
    for (const k in cart) {
        sub += cart[k].qty * cart[k].harga;
        cups += cart[k].qty;
        items.push({ name: k, qty: cart[k].qty, harga: cart[k].harga });
    }
    
    sessionOrders.push({ 
        id: orderCounter, 
        time: fmtTime(now()), 
        customer: custName,
        payment: paymentMethod, 
        items, 
        subtotal: sub, 
        totalCup: cups 
    });
    
    cart = {};
    custInput.value = ""; 
    paymentInput.value = "Tunai"; 
    updateAll();
    closeCartModal();
    showToast(`Pesanan #${orderCounter} (${paymentMethod}) dikonfirmasi!`);
}

// ==========================================
// 4. MODAL KERANJANG (CART)
// ==========================================
function updateFloatBtn() {
    let totalQty = 0;
    let totalRp = 0;
    for (let k in cart) {
        totalQty += cart[k].qty;
        totalRp += cart[k].qty * cart[k].harga;
    }
    
    const btn = document.getElementById('float-cart-btn');
    if (totalQty > 0) {
        btn.style.display = 'flex';
        document.getElementById('float-cart-badge').innerText = totalQty;
        document.getElementById('float-cart-total').innerText = "Rp " + totalRp.toLocaleString('id-ID');
    } else {
        btn.style.display = 'none';
    }
}

function openCartModal() {
    document.getElementById('cart-modal-overlay').style.display = 'block';
    updateCartModal();
}

function closeCartModal(e) {
    if (e && e.target.id !== 'cart-modal-overlay' && !e.target.classList.contains('btn-close-modal')) return;
    document.getElementById('cart-modal-overlay').style.display = 'none';
}

function updateCartModal() {
    const container = document.getElementById('modal-cart-items');
    if (!container) return;
    container.innerHTML = '';
    let subtotal = 0;
    
    for (let k in cart) {
        const item = cart[k];
        subtotal += item.qty * item.harga;
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <div><b>${k}</b> <small style="color:#888">x${item.qty}</small></div>
                <div>Rp ${(item.qty * item.harga).toLocaleString('id-ID')}</div>
            </div>`;
    }
    
    if (Object.keys(cart).length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">Keranjang Kosong</div>';
    }
    document.getElementById('modal-subtotal').innerText = "Rp " + subtotal.toLocaleString('id-ID');
}

function resetCartOnly() {
    cart = {};
    updateAll();
    closeCartModal();
    showToast("Keranjang dibersihkan");
}

// ==========================================
// 5. PENGELUARAN (EXPENSES)
// ==========================================
function addExpense() {
    const name = document.getElementById('exp-name').value.trim();
    const price = cleanNum(document.getElementById('exp-price').value);
    if (!name || price <= 0) return alert("Masukkan nama barang dan harga!");

    expenses.push({ name, price });
    document.getElementById('exp-name').value = "";
    document.getElementById('exp-price').value = "";
    renderExpenses();
    calcTotal();
    saveState(); // Simpan otomatis
}

function removeExpense(index) {
    expenses.splice(index, 1);
    renderExpenses();
    calcTotal();
    saveState(); // Simpan otomatis
}

function renderExpenses() {
    const container = document.getElementById('expense-list');
    if(!container) return;
    container.innerHTML = "";
    expenses.forEach((item, index) => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding:8px; border-radius:8px; margin-bottom:5px; font-size:13px; border:1px solid #eee">
                <span><b>${item.name}</b>: Rp ${item.price.toLocaleString('id-ID')}</span>
                <button onclick="removeExpense(${index})" style="background:none; border:none; color:#d32f2f; cursor:pointer; font-weight:bold;">✕</button>
            </div>`;
    });
}

// ==========================================
// 6. RIWAYAT & NAVIGATION
// ==========================================
function renderRiwayat() {
    const list = document.getElementById('riwayat-list');
    if (!list) return;
    list.innerHTML = "";
    if (sessionOrders.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#888">Belum ada transaksi</div>';
        return;
    }
    [...sessionOrders].reverse().forEach(o => {
        list.innerHTML += `
            <div class="riwayat-row" style="border-bottom:1px solid #eee; padding:10px 0">
                <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                    <b>#${o.id} - ${o.customer}</b>
                    <span style="color:#d32f2f; font-weight:bold">Rp ${o.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div style="font-size:11px; color:#999; margin-bottom:4px; display:flex; justify-content:space-between">
                    <span>🕒 ${o.time}</span>
                    <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:600; color:#475569;">💳 ${o.payment}</span>
                </div>
                <small style="color:#666">${o.items.map(i => i.name + " x" + i.qty).join(", ")}</small>
            </div>`;
    });
}

function exportRiwayat() {
    if(sessionOrders.length === 0) return alert("Belum ada data untuk disalin.");
    let text = "📋 *REKAP TRANSAKSI HARI INI*\n\n";
    sessionOrders.forEach(o => {
        text += `*#${o.id} - ${o.customer}* (${o.time}) - [${o.payment}]\n`;
        text += o.items.map(i => `- ${i.name} x${i.qty}`).join("\n") + "\n";
        text += `Subtotal: Rp ${o.subtotal.toLocaleString('id-ID')}\n\n`;
    });
    navigator.clipboard.writeText(text).then(() => showToast("Riwayat disalin ke clipboard!"));
}

function openTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    document.getElementById(id)?.classList.add('active');
    if (btn) btn.classList.add('active');
    
    if (id === 'tab-riwayat') renderRiwayat();
}

// ==========================================
// 7. INTEGRASI (SHEETS & WA)
// ==========================================
async function sendToSheet(payload) {
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        console.error("Gagal kirim ke Sheet:", error);
        return false;
    }
}

async function checkout() {
    const nama = document.getElementById('p_nama')?.value.trim();
    const outlet = document.getElementById('p_outlet')?.value;
    if (!nama) {
        alert("Harap isi nama di tab Check-In terlebih dahulu!");
        openTab('tab-absen', document.querySelector('.nav-item[onclick*="tab-absen"]'));
        return;
    }

    const nowTime = now();
    const sisaCup = document.getElementById('stok_cup')?.value || "0";
    const sisaBahan = document.getElementById('stok_bahan')?.value || "-";
    const catatanStok = document.getElementById('stok_note')?.value || "-";

    const modalAwal = cleanNum(document.getElementById('p_rupiah')?.value);
    const totalCup = sessionOrders.reduce((a, o) => a + o.totalCup, 0);
    const totalKeluar = expenses.reduce((a, b) => a + b.price, 0);
    
    let omzetTunai = 0, omzetQRIS = 0, omzetOnline = 0;
    sessionOrders.forEach(o => {
        if (o.payment === 'Tunai') omzetTunai += o.subtotal;
        else if (o.payment === 'QRIS') omzetQRIS += o.subtotal;
        else if (o.payment === 'Online') omzetOnline += o.subtotal;
    });
    
    const totalJual = omzetTunai + omzetQRIS + omzetOnline;
    const setoranTunai = modalAwal + omzetTunai - totalKeluar;

    let itemRekap = {};
    sessionOrders.forEach(order => {
        order.items.forEach(item => {
            if(!itemRekap[item.name]) itemRekap[item.name] = 0;
            itemRekap[item.name] += item.qty;
        });
    });

    let detailTerjualTeks = "";
    for (let menuName in itemRekap) {
        detailTerjualTeks += `• ${menuName} : ${itemRekap[menuName]}\n`;
    }
    if (detailTerjualTeks === "") detailTerjualTeks = "• Tidak ada penjualan\n";

    const detailKeluarTeks = expenses.map(e => `• ${e.name}: Rp ${e.price.toLocaleString('id-ID')}`).join("\n");
    const detailKeluarSheet = expenses.map(e => `${e.name} (Rp ${e.price})`).join(", ");
    const detailTerjualSheet = Object.entries(itemRekap).map(([k,v]) => `${k}(${v})`).join(", ");

    const payload = {
        waktu: fmtDate(nowTime) + " " + fmtTime(nowTime),
        nama, shift: outlet || '-', totalJual, pengeluaran: totalKeluar,
        detailPengeluaran: detailKeluarSheet, qris: omzetQRIS, netto: setoranTunai,
        stok: `Sisa Cup: ${sisaCup}, Bahan: ${sisaBahan}`,
        detailTerjual: detailTerjualSheet 
    };
    
    await sendToSheet(payload);

    let teks = `*LAPORAN KOPI RIMBA*\n👤 ${nama}\n🏠 ${outlet || '-'}\n📅 ${fmtDate(nowTime)}\n━━━━━━━━━━━━\n\n`;
    
    teks += `*LAPORAN KEUANGAN TUNAI:*\n`;
    teks += `💼 Modal Awal: Rp ${modalAwal.toLocaleString('id-ID')}\n`;
    teks += `➕ Omzet Tunai: Rp ${omzetTunai.toLocaleString('id-ID')}\n`;
    teks += `➖ Pengeluaran: Rp ${totalKeluar.toLocaleString('id-ID')}\n`;
    teks += `✅ *SETORAN BERSIH: Rp ${setoranTunai.toLocaleString('id-ID')}*\n━━━━━━━━━━━━\n\n`;
    
    teks += `*RINGKASAN PENJUALAN:*\n`;
    teks += `🥤 Volume: ${totalCup} Cup\n`;
    teks += `💰 Total Omzet: Rp ${totalJual.toLocaleString('id-ID')}\n\n`;
    
    teks += `*METODE PEMBAYARAN:*\n`;
    teks += `💵 Tunai: Rp ${omzetTunai.toLocaleString('id-ID')}\n`;
    teks += `📱 QRIS: Rp ${omzetQRIS.toLocaleString('id-ID')}\n`;
    teks += `🛵 Online: Rp ${omzetOnline.toLocaleString('id-ID')}\n━━━━━━━━━━━━\n\n`;

    teks += `*DETAIL MENU TERJUAL:*\n${detailTerjualTeks}\n━━━━━━━━━━━━\n\n`;
    
    teks += `*PENGELUARAN:*\n${expenses.length > 0 ? detailKeluarTeks + `\n> *Total:* Rp ${totalKeluar.toLocaleString('id-ID')}\n\n` : "• Tidak ada pengeluaran\n\n"}`;
    
    teks += `*STOK OPNAME SISA:*\n📦 Cup: ${sisaCup}\n🌿 Bahan: ${sisaBahan}\n📝 Note: ${catatanStok}\n━━━━━━━━━━━━`;

    window.open(`https://api.whatsapp.com/send?phone=${ADMIN}&text=${encodeURIComponent(teks)}`);

    if (confirm("Laporan terkirim. Reset semua data shift ini?")) resetSemuaData();
}

function resetSemuaData() {
    sessionOrders = []; expenses = []; cart = {}; orderCounter = 0;
    
    // Kosongkan input form (kecuali Nama dan Outlet)
    const fields = ['p_rupiah', 'stok_cup', 'stok_bahan', 'stok_note', 'exp-name', 'exp-price', 'cart-customer-name'];
    fields.forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
    
    renderExpenses();
    updateAll(); // updateAll() memanggil saveState(), sehingga otomatis menimpa cache dengan data kosong
    renderRiwayat();
    showToast("Data shift telah di-reset.");
}

// ==========================================
// 8. INITIALIZATION
// ==========================================
function updateAll() {
    renderMenu();
    updateFloatBtn();
    updateCartModal();
    calcTotal();
    saveState(); // Simpan otomatis setiap ada perubahan UI
}

// Live Clock
setInterval(() => {
    const el = document.getElementById('live-clock');
    if (el) el.innerText = fmtTime(now());
}, 1000);

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    loadState(); // LOAD DATA SEBELUMNYA JIKA ADA

    // Deteksi otomatis ketikan pada input Modal dan Stok agar tersimpan langsung
    const inputIds = ['p_rupiah', 'stok_cup', 'stok_bahan', 'stok_note'];
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', () => saveState());
    });

    renderMenu();
    renderRiwayat();
    renderExpenses();
    updateAll();
    
    // Auto-load saved profile (Nama & Outlet)
    const savedNama = localStorage.getItem('rimba_nama');
    const savedOutlet = localStorage.getItem('rimba_outlet');
    if(savedNama) document.getElementById('p_nama').value = savedNama;
    if(savedOutlet) document.getElementById('p_outlet').value = savedOutlet;
    updateProfile();
});

// ==========================================
// 9. FUNGSI RESET DARURAT
// ==========================================
function confirmResetDarurat() {
    hapticFeedback(); // Memberikan efek getar jika didukung
    
    const peringatan = "🚨 PERINGATAN DARURAT! 🚨\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA shift ini?\nSemua keranjang, riwayat, dan pengeluaran yang BELUM DIKIRIM akan hilang selamanya.";
    
    if (confirm(peringatan)) {
        // Panggil fungsi reset bawaan yang sudah kamu buat sebelumnya
        resetSemuaData();
        
        // Kembalikan tampilan ke tab awal (Check-in) agar kasir sadar data sudah bersih
        const btnAbsen = document.querySelector('.nav-item[onclick*="tab-absen"]');
        if (btnAbsen) openTab('tab-absen', btnAbsen);
        
        showToast("🚨 Semua data berhasil dikosongkan!");
    }
}
