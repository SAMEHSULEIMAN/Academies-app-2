document.addEventListener("DOMContentLoaded", function () {
    // البيانات الافتراضية
    const DEFAULT_SPORTS = [
        { name: 'كرة قدم', prices: { 8: 400, 12: 550, 16: 700, 24: 1000 } }
    ];

    let members = JSON.parse(localStorage.getItem('clubMembers')) || [];
    let sports = JSON.parse(localStorage.getItem('clubSports')) || DEFAULT_SPORTS;
    let attendanceLogs = JSON.parse(localStorage.getItem('clubAttendance')) || {};
    let paymentLogs = JSON.parse(localStorage.getItem('clubPayments')) || [];

    // =========================
    // دوال مساعدة
    // =========================
    function saveAll() {
        localStorage.setItem('clubMembers', JSON.stringify(members));
        localStorage.setItem('clubSports', JSON.stringify(sports));
        localStorage.setItem('clubPayments', JSON.stringify(paymentLogs));
        localStorage.setItem('clubAttendance', JSON.stringify(attendanceLogs));
    }

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show toast-${type}`;
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // =========================
    // التنقل بين الأقسام
    // =========================
    window.showSection = function (id) {
        document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        if (id === 'member-list') {
            updateSportFilterOptions();
            updateGenderFilterOptions(); // جديد
            applyFilters();
        }
        if (id === 'manage-sports') renderSportsTable();
        if (id === 'attendance') {
            updateAttendanceSportFilter();
            renderAttendance();
        }
        if (id === 'alerts') updateAlerts();
        if (id === 'payments') {
            updatePaymentSportFilter();
            renderPayments();
        }
        if (id === 'add-member') updateSportDropdowns();
        updateStats();
    };

    // =========================
    // تحديث الإحصائيات والرسوم البيانية
    // =========================
    function updateStats() {
        document.getElementById('stat-members').innerText = members.length;
        const totalPaid = paymentLogs.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const totalRemaining = members.reduce((sum, m) => sum + (m.remaining || 0), 0);
        document.getElementById('stat-revenue').innerText = totalPaid + ' ج.م';
        document.getElementById('stat-remaining').innerText = totalRemaining + ' ج.م';
        renderCharts();
        updateAlerts();
    }

    let chartMembersSport, chartRevenueMonth, chartExpiry, chartGender;
    function renderCharts() {
        // المشتركين حسب الرياضة
        const sportCounts = {};
        members.forEach(m => sportCounts[m.sport] = (sportCounts[m.sport] || 0) + 1);
        const sportLabels = Object.keys(sportCounts);
        const sportData = Object.values(sportCounts);
        if (chartMembersSport) chartMembersSport.destroy();
        chartMembersSport = new Chart(document.getElementById('chart-members-sport'), {
            type: 'doughnut',
            data: { labels: sportLabels, datasets: [{ data: sportData, backgroundColor: ['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6'] }] },
            options: { responsive: true }
        });

        // الإيرادات الشهرية
        const monthRevenue = {};
        paymentLogs.forEach(p => {
            const month = p.date.slice(0, 7);
            monthRevenue[month] = (monthRevenue[month] || 0) + parseFloat(p.amount);
        });
        const monthLabels = Object.keys(monthRevenue).sort();
        const monthData = monthLabels.map(m => monthRevenue[m]);
        if (chartRevenueMonth) chartRevenueMonth.destroy();
        chartRevenueMonth = new Chart(document.getElementById('chart-revenue-month'), {
            type: 'bar',
            data: { labels: monthLabels, datasets: [{ label: 'الإيرادات', data: monthData, backgroundColor: '#27ae60' }] },
            options: { responsive: true }
        });

        // الاشتراكات: منتهي، قريب، نشط
        let expired = 0, soon = 0, active = 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        members.forEach(m => {
            const expiry = new Date(m.expiryDate);
            const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            if (diff < 0) expired++;
            else if (diff <= 3) soon++;
            else active++;
        });
        if (chartExpiry) chartExpiry.destroy();
        chartExpiry = new Chart(document.getElementById('chart-expiry'), {
            type: 'pie',
            data: { labels: ['منتهي', 'قريب', 'نشط'], datasets: [{ data: [expired, soon, active], backgroundColor: ['#e74c3c', '#f39c12', '#27ae60'] }] },
            options: { responsive: true }
        });

        // نسبة الذكور / الإناث
        let male = 0, female = 0;
        members.forEach(m => {
            if (m.gender === 'ذكر') male++;
            else if (m.gender === 'أنثى') female++;
        });
        if (chartGender) chartGender.destroy();
        chartGender = new Chart(document.getElementById('chart-gender'), {
            type: 'pie',
            data: { labels: ['ذكور', 'إناث'], datasets: [{ data: [male, female], backgroundColor: ['#3498db', '#e83e8c'] }] },
            options: { responsive: true }
        });
    }

    // =========================
    // تحديث القوائم المنسدلة
    // =========================
    function updateSportDropdowns() {
        const select = document.getElementById('m-sport');
        select.innerHTML = '';
        sports.forEach(s => {
            select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
    }

    function updateSportFilterOptions() {
        const filterSport = document.getElementById('filter-sport');
        filterSport.innerHTML = '<option value="">كل الرياضات</option>';
        sports.forEach(s => {
            filterSport.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
    }

    function updateGenderFilterOptions() {
        // موجودة بشكل ثابت في HTML، لكن يمكن تركها
    }

    function updateAttendanceSportFilter() {
        const select = document.getElementById('att-sport-filter');
        select.innerHTML = '<option value="">كل الألعاب</option>';
        sports.forEach(s => {
            select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
    }

    function updatePaymentSportFilter() {
        const select = document.getElementById('pay-sport-filter');
        select.innerHTML = '<option value="">كل الألعاب</option>';
        sports.forEach(s => {
            select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
    }

    // =========================
    // حساب خطة الاشتراك
    // =========================
    window.calculatePlan = function () {
        const sportName = document.getElementById('m-sport').value;
        const freq = parseInt(document.getElementById('m-freq').value);
        const duration = parseInt(document.getElementById('m-duration').value);
        const start = document.getElementById('m-start').value;
        const sport = sports.find(s => s.name === sportName);
        if (!sport) return;
        const total = (sport.prices[freq] || 0) * duration;
        document.getElementById('m-total-price').innerText = total;
        if (start) {
            const startDate = new Date(start);
            const expiry = new Date(startDate);
            expiry.setMonth(expiry.getMonth() + duration);
            document.getElementById('m-expiry').value = expiry.toISOString().split('T')[0];
        }
        updateRemaining();
    };

    window.updateRemaining = function () {
        const total = parseFloat(document.getElementById('m-total-price').innerText) || 0;
        let paid = parseFloat(document.getElementById('m-paid').value) || 0;
        if (paid > total) paid = total;
        document.getElementById('m-remaining').innerText = total - paid;
    };

    // =========================
    // إضافة / تعديل مشترك
    // =========================
    document.getElementById('member-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const editId = document.getElementById('edit-id').value;
        const totalAmount = parseFloat(document.getElementById('m-total-price').innerText) || 0;
        const paidAmount = parseFloat(document.getElementById('m-paid').value) || 0;
        const remaining = totalAmount - paidAmount;
        const member = {
            id: editId ? parseInt(editId) : Date.now(),
            name: document.getElementById('m-name').value,
            phone: document.getElementById('m-phone').value,
            gender: document.getElementById('m-gender').value,
            sport: document.getElementById('m-sport').value,
            freq: document.getElementById('m-freq').value,
            duration: document.getElementById('m-duration').value,
            startDate: document.getElementById('m-start').value,
            expiryDate: document.getElementById('m-expiry').value,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            remaining: remaining
        };

        if (editId) {
            const index = members.findIndex(m => m.id === parseInt(editId));
            if (index !== -1) members[index] = member;
            showToast('تم تحديث البيانات بنجاح', 'success');
        } else {
            members.push(member);
            if (paidAmount > 0) {
                paymentLogs.push({
                    date: new Date().toLocaleDateString('en-CA'),
                    name: member.name,
                    sport: member.sport,  // حفظ اللعبة
                    amount: paidAmount
                });
            }
            showToast('تم تسجيل المشترك بنجاح', 'success');
        }
        saveAll();
        printReceipt(member);
        resetForm();
        showSection('member-list');
    });

    function resetForm() {
        document.getElementById('member-form').reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('m-total-price').innerText = '0';
        document.getElementById('m-remaining').innerText = '0';
        document.getElementById('cancel-edit').style.display = 'none';
    }

    // =========================
    // طباعة الإيصال (مع إضافة النوع)
    // =========================
    function printReceipt(m) {
        document.getElementById('pr-name').innerText = m.name;
        document.getElementById('pr-gender').innerText = m.gender;
        document.getElementById('pr-sport').innerText = m.sport;
        document.getElementById('pr-freq').innerText = m.freq;
        document.getElementById('pr-duration').innerText = m.duration;
        document.getElementById('pr-expiry').innerText = m.expiryDate;
        document.getElementById('pr-amount').innerText = m.paidAmount + ' ج.م';
        document.getElementById('pr-date').innerText = new Date().toLocaleDateString('ar-EG');
        window.print();
    }

    window.printReceiptById = function (id) {
        const m = members.find(x => x.id === id);
        if (m) printReceipt(m);
    };

    // =========================
    // قائمة المشتركين مع فلترة (بما في ذلك النوع)
    // =========================
    function applyFilters() {
        const search = document.getElementById('search-input').value.toLowerCase();
        const sport = document.getElementById('filter-sport').value;
        const gender = document.getElementById('filter-gender').value;
        const payment = document.getElementById('filter-payment').value;
        const expiry = document.getElementById('filter-expiry').value;

        const filtered = members.filter(m => {
            if (search && !m.name.toLowerCase().includes(search) && !m.phone.includes(search)) return false;
            if (sport && m.sport !== sport) return false;
            if (gender && m.gender !== gender) return false;
            if (payment === 'paid' && m.remaining !== 0) return false;
            if (payment === 'partial' && (m.remaining === 0 || m.paidAmount === 0)) return false;
            if (payment === 'unpaid' && m.paidAmount !== 0) return false;
            const today = new Date(); today.setHours(0,0,0,0);
            const exp = new Date(m.expiryDate);
            const diff = Math.ceil((exp - today) / (86400000));
            if (expiry === 'expired' && diff >= 0) return false;
            if (expiry === 'soon' && (diff > 3 || diff < 0)) return false;
            if (expiry === 'active' && diff <= 3) return false;
            return true;
        });

        renderMembers(filtered);
    }

    function renderMembers(filteredArray = null) {
        const data = filteredArray || members;
        const body = document.getElementById('member-table-body');
        let html = '';
        data.forEach(m => {
            const statusClass = m.remaining === 0 ? 'paid' : (m.paidAmount === 0 ? 'unpaid' : 'partial');
            html += `<tr>
                <td>${m.name}</td>
                <td>${m.gender}</td>
                <td>${m.sport}</td>
                <td>${m.expiryDate}</td>
                <td class="payment-status ${statusClass}">
                    ${m.paidAmount} / ${m.totalAmount} ج.م<br>
                    <small>المتبقي: ${m.remaining}</small>
                </td>
                <td>
                    <button onclick="editMember(${m.id})" class="btn-edit">✏️</button>
                    <button onclick="addPayment(${m.id})" class="btn-secondary">💰 دفعة</button>
                    <button onclick="printReceiptById(${m.id})" class="btn-excel">🖨️</button>
                    <button onclick="deleteMember(${m.id})" class="btn-danger">❌</button>
                </td>
            </tr>`;
        });
        body.innerHTML = html || '<tr><td colspan="6">لا توجد نتائج</td></tr>';
    }

    // أحداث الفلترة
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-sport').addEventListener('change', applyFilters);
    document.getElementById('filter-gender').addEventListener('change', applyFilters);
    document.getElementById('filter-payment').addEventListener('change', applyFilters);
    document.getElementById('filter-expiry').addEventListener('change', applyFilters);

    // =========================
    // تعديل مشترك
    // =========================
    window.editMember = function (id) {
        const m = members.find(x => x.id === id);
        if (!m) return;
        showSection('add-member');
        document.getElementById('form-title').innerText = 'تعديل بيانات المشترك';
        document.getElementById('edit-id').value = m.id;
        document.getElementById('m-name').value = m.name;
        document.getElementById('m-phone').value = m.phone;
        document.getElementById('m-gender').value = m.gender;
        document.getElementById('m-sport').value = m.sport;
        document.getElementById('m-freq').value = m.freq;
        document.getElementById('m-duration').value = m.duration;
        document.getElementById('m-start').value = m.startDate;
        document.getElementById('m-paid').value = m.paidAmount;
        calculatePlan();
        document.getElementById('cancel-edit').style.display = 'inline-block';
    };

    window.deleteMember = function (id) {
        if (!confirm('تأكيد الحذف؟')) return;
        members = members.filter(m => m.id !== id);
        saveAll();
        applyFilters();
        showToast('تم الحذف بنجاح', 'warning');
    };

    document.getElementById('cancel-edit').addEventListener('click', function () {
        resetForm();
        showSection('member-list');
    });

    // =========================
    // إضافة دفعة جديدة (مع حفظ اللعبة)
    // =========================
    window.addPayment = function (id) {
        const m = members.find(x => x.id === id);
        if (!m) return;
        const amount = prompt(`أدخل المبلغ المدفوع للمشترك ${m.name} (المتبقي: ${m.remaining})`, m.remaining);
        if (amount === null) return;
        const paid = parseFloat(amount);
        if (isNaN(paid) || paid <= 0) return showToast('قيمة غير صالحة', 'error');
        if (paid > m.remaining) {
            if (!confirm(`المبلغ أكبر من المتبقي (${m.remaining}). هل تريد تسديد الكامل؟`)) return;
            m.paidAmount += m.remaining;
            m.remaining = 0;
        } else {
            m.paidAmount += paid;
            m.remaining -= paid;
        }
        // تسجيل الدفعة مع اسم اللعبة
        paymentLogs.push({
            date: new Date().toLocaleDateString('en-CA'),
            name: m.name,
            sport: m.sport,
            amount: paid
        });
        saveAll();
        applyFilters();
        updateStats();
        showToast('تم تسجيل الدفعة بنجاح', 'success');
    };

    // =========================
    // إدارة الألعاب (كما هي)
    // =========================
    function renderSportsTable() {
        const body = document.getElementById('sport-table-body');
        let html = '';
        sports.forEach((s, i) => {
            html += `<tr>
                <td>${s.name}</td>
                <td>${s.prices[8]}</td>
                <td>${s.prices[12]}</td>
                <td>${s.prices[16]}</td>
                <td>${s.prices[24]}</td>
                <td><button onclick="openEditSportModal(${i})" class="btn-edit">✏️</button></td>
                <td><button onclick="deleteSport(${i})" class="btn-danger">🗑️</button></td>
            </tr>`;
        });
        body.innerHTML = html;
    }

    window.addNewSport = function () {
        const name = document.getElementById('s-name').value.trim();
        if (!name) return showToast('اكتب اسم اللعبة', 'error');
        const prices = {
            8: parseFloat(document.getElementById('s-p8').value) || 0,
            12: parseFloat(document.getElementById('s-p12').value) || 0,
            16: parseFloat(document.getElementById('s-p16').value) || 0,
            24: parseFloat(document.getElementById('s-p24').value) || 0
        };
        sports.push({ name, prices });
        saveAll();
        renderSportsTable();
        updateSportDropdowns();
        updateAttendanceSportFilter();
        updatePaymentSportFilter();
        document.getElementById('s-name').value = '';
        document.querySelectorAll('#manage-sports input[type="number"]').forEach(i => i.value = '');
        showToast('تمت إضافة اللعبة', 'success');
    };

    window.deleteSport = function (i) {
        if (!confirm('حذف اللعبة؟')) return;
        sports.splice(i, 1);
        saveAll();
        renderSportsTable();
        updateSportDropdowns();
        updateAttendanceSportFilter();
        updatePaymentSportFilter();
        showToast('تم الحذف', 'warning');
    };

    // Modal تعديل اللعبة
    window.openEditSportModal = function (index) {
        const sport = sports[index];
        document.getElementById('edit-sport-index').value = index;
        document.getElementById('edit-sport-name').value = sport.name;
        document.getElementById('edit-p8').value = sport.prices[8];
        document.getElementById('edit-p12').value = sport.prices[12];
        document.getElementById('edit-p16').value = sport.prices[16];
        document.getElementById('edit-p24').value = sport.prices[24];
        document.getElementById('editSportModal').style.display = 'flex';
    };

    window.saveSportEdit = function () {
        const index = document.getElementById('edit-sport-index').value;
        const sport = sports[index];
        sport.prices[8] = parseFloat(document.getElementById('edit-p8').value) || 0;
        sport.prices[12] = parseFloat(document.getElementById('edit-p12').value) || 0;
        sport.prices[16] = parseFloat(document.getElementById('edit-p16').value) || 0;
        sport.prices[24] = parseFloat(document.getElementById('edit-p24').value) || 0;
        saveAll();
        renderSportsTable();
        updateSportDropdowns();
        closeModal();
        showToast('تم التحديث', 'success');
    };

    window.closeModal = function () {
        document.getElementById('editSportModal').style.display = 'none';
    };

    // =========================
    // الحضور اليومي مع فلتر الرياضة
    // =========================
    window.renderAttendance = function () {
        const dateInput = document.getElementById('att-date');
        const date = dateInput.value || new Date().toISOString().split('T')[0];
        dateInput.value = date;
        const sportFilter = document.getElementById('att-sport-filter').value;
        const body = document.getElementById('att-table-body');
        let html = '';
        const filteredMembers = sportFilter ? members.filter(m => m.sport === sportFilter) : members;
        filteredMembers.forEach(m => {
            const checked = attendanceLogs[date]?.includes(m.id) ? 'checked' : '';
            html += `<tr>
                <td>${m.name}</td>
                <td>${m.gender}</td>
                <td>${m.sport}</td>
                <td><input type="checkbox" ${checked} onchange="toggleAtt(${m.id}, '${date}')"></td>
            </tr>`;
        });
        body.innerHTML = html;
    };

    window.toggleAtt = function (id, date) {
        if (!attendanceLogs[date]) attendanceLogs[date] = [];
        const index = attendanceLogs[date].indexOf(id);
        if (index > -1) attendanceLogs[date].splice(index, 1);
        else attendanceLogs[date].push(id);
    };

    window.saveAttendance = function () {
        saveAll();
        showToast('تم حفظ الحضور', 'success');
    };

    // =========================
    // سجل المدفوعات مع فلتر الرياضة
    // =========================
    function renderPayments() {
        const sportFilter = document.getElementById('pay-sport-filter').value;
        const body = document.getElementById('pay-table-body');
        let html = '';
        const filtered = sportFilter ? paymentLogs.filter(p => p.sport === sportFilter) : paymentLogs;
        filtered.slice().reverse().forEach(p => {
            html += `<tr><td>${p.date}</td><td>${p.name}</td><td>${p.sport || 'غير محدد'}</td><td>${p.amount} ج.م</td></tr>`;
        });
        body.innerHTML = html || '<tr><td colspan="4">لا توجد مدفوعات</td></tr>';
    }

// 🟢 هذا السطر هو المهم: جعل الدالة عامة
window.renderPayments = renderPayments;

    // =========================
    // التنبيهات الذكية
    // =========================
    function updateAlerts() {
        const list = document.getElementById('alerts-list');
        let html = '';
        let count = 0;
        const today = new Date(); today.setHours(0,0,0,0);

        members.forEach(m => {
            const expiry = new Date(m.expiryDate);
            const diff = Math.ceil((expiry - today) / (86400000));
            let alertClass = '', msg = '';

            if (diff < 0) {
                alertClass = 'alert-danger';
                msg = `⚠️ منتهي: ${m.name} (انتهى في ${m.expiryDate})`;
                count++;
            } else if (diff <= 3) {
                alertClass = 'alert-warning';
                msg = `⏳ ينتهي قريباً: ${m.name} (باقي ${diff} أيام)`;
                count++;
            } else if (m.remaining > 0) {
                alertClass = 'alert-info';
                msg = `💰 متبقي عليه: ${m.name} (${m.remaining} ج.م)`;
                count++;
            }
            if (msg) html += `<div class="alert-item ${alertClass}">${msg}</div>`;
        });

        list.innerHTML = html || '<div>لا توجد تنبيهات</div>';
        document.getElementById('alert-count').innerText = count;
        document.getElementById('stat-alerts').innerText = count;
    }

    // محاكاة إرسال تذكير بريد
    window.sendReminderEmail = function () {
        const expired = members.filter(m => new Date(m.expiryDate) < new Date()).map(m => m.name).join('، ');
        if (!expired) return showToast('لا يوجد مشتركين منتهين', 'info');
        navigator.clipboard.writeText(expired).then(() => {
            showToast('تم نسخ أسماء المنتهين، يمكنك لصقها في بريدك', 'success');
        });
    };

    // =========================
    // تصدير PDF / Excel (تعديل ليشمل النوع واللعبة)
    // =========================
    window.exportToPDF = function (type) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let headers, data;

        if (type === 'members') {
            headers = [['الاسم', 'النوع', 'الرياضة', 'تاريخ الانتهاء', 'المدفوع', 'المتبقي']];
            data = members.map(m => [m.name, m.gender, m.sport, m.expiryDate, m.paidAmount, m.remaining]);
            doc.text('قائمة المشتركين', 10, 10);
        } else if (type === 'attendance') {
            const date = document.getElementById('att-date').value;
            const sportFilter = document.getElementById('att-sport-filter').value;
            const attList = attendanceLogs[date] || [];
            const filteredMembers = sportFilter ? members.filter(m => m.sport === sportFilter) : members;
            headers = [['الاسم', 'النوع', 'الرياضة', 'الحالة']];
            data = filteredMembers.map(m => [m.name, m.gender, m.sport, attList.includes(m.id) ? 'حاضر' : 'غائب']);
            doc.text(`كشف الحضور ليوم ${date}`, 10, 10);
        } else if (type === 'payments') {
            const sportFilter = document.getElementById('pay-sport-filter').value;
            const filtered = sportFilter ? paymentLogs.filter(p => p.sport === sportFilter) : paymentLogs;
            headers = [['التاريخ', 'المشترك', 'اللعبة', 'المبلغ']];
            data = filtered.map(p => [p.date, p.name, p.sport || '', p.amount + ' ج.م']);
            doc.text('سجل المدفوعات', 10, 10);
        }

        doc.autoTable({ head: headers, body: data, startY: 20, theme: 'grid' });
        doc.save(`${type}.pdf`);
    };

    window.exportToExcel = function (type) {
        let data, sheetName;
        if (type === 'members') {
            data = members.map(m => ({ الاسم: m.name, النوع: m.gender, الرياضة: m.sport, 'تاريخ الانتهاء': m.expiryDate, المدفوع: m.paidAmount, المتبقي: m.remaining }));
            sheetName = 'المشتركين';
        } else if (type === 'attendance') {
            const date = document.getElementById('att-date').value;
            const sportFilter = document.getElementById('att-sport-filter').value;
            const attList = attendanceLogs[date] || [];
            const filteredMembers = sportFilter ? members.filter(m => m.sport === sportFilter) : members;
            data = filteredMembers.map(m => ({ الاسم: m.name, النوع: m.gender, الرياضة: m.sport, الحالة: attList.includes(m.id) ? 'حاضر' : 'غائب' }));
            sheetName = `حضور ${date}`;
        } else if (type === 'payments') {
            const sportFilter = document.getElementById('pay-sport-filter').value;
            const filtered = sportFilter ? paymentLogs.filter(p => p.sport === sportFilter) : paymentLogs;
            data = filtered.map(p => ({ التاريخ: p.date, المشترك: p.name, اللعبة: p.sport || '', المبلغ: p.amount }));
            sheetName = 'المدفوعات';
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${type}.xlsx`);
    };

    // =========================
    // النسخ الاحتياطي
    // =========================
    window.exportData = function () {
        const data = { members, sports, paymentLogs, attendanceLogs };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'backup.json';
        link.click();
    };

    window.importData = function (e) {
        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                const data = JSON.parse(ev.target.result);
                members = data.members || [];
                sports = data.sports || DEFAULT_SPORTS;
                paymentLogs = data.paymentLogs || [];
                attendanceLogs = data.attendanceLogs || {};
                saveAll();
                location.reload();
            } catch {
                showToast('ملف غير صالح', 'error');
            }
        };
        reader.readAsText(e.target.files[0]);
    };

    window.resetSystem = function () {
        if (!confirm('سيتم حذف كل البيانات نهائياً! هل أنت متأكد؟')) return;
        localStorage.clear();
        members = [];
        sports = DEFAULT_SPORTS;
        paymentLogs = [];
        attendanceLogs = {};
        saveAll();
        location.reload();
    };

    // =========================
    // الوضع الداكن
    // =========================
    const themeBtn = document.getElementById('themeBtn');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark');
    if (themeBtn) {
        themeBtn.innerText = document.body.classList.contains('dark') ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن';
        themeBtn.addEventListener('click', function () {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeBtn.innerText = isDark ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن';
        });
    }

    // =========================
    // التهيئة الأولية
    // =========================
    updateSportDropdowns();
    updateSportFilterOptions();
    updateAttendanceSportFilter();
    updatePaymentSportFilter();
    updateStats();
    renderMembers();
    updateAlerts();
});