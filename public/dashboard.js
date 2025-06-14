document.addEventListener('DOMContentLoaded', () => {
    const todayPendingOrdersSpan = document.getElementById('todayPendingOrders');
    const tomorrowDueOrdersSpan = document.getElementById('tomorrowDueOrders');
    const overdueUncompletedOrdersSpan = document.getElementById('overdueUncompletedOrders');
    const recentOrdersListDiv = document.getElementById('recentOrdersList');
    const allPendingOrdersListDiv = document.getElementById('allPendingOrdersList');

    async function fetchDashboardData() {
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const orders = await response.json();

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const dayAfterTomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

            let todayPendingCount = 0;
            let tomorrowDueCount = 0;
            let overdueUncompletedCount = 0;

            const recentOrders = []; 
            const allPendingOrders = []; 

            orders.forEach(order => {
                if (order.orderStatus === '已取貨/送達' || order.orderStatus === '已取消') {
                    return;
                }

                let eventTime = null;
                if (order.needsDelivery && order.deliveryTime) {
                    eventTime = new Date(order.deliveryTime);
                } else if (!order.needsDelivery && order.pickupTime) {
                    eventTime = new Date(order.pickupTime);
                }

                order.eventTime = eventTime; 

                if (eventTime) {
                    if (eventTime >= todayStart && eventTime < tomorrowStart) {
                        todayPendingCount++;
                    }
                    else if (eventTime >= tomorrowStart && eventTime < dayAfterTomorrowStart) {
                        tomorrowDueCount++;
                    }
                    else if (eventTime < todayStart) {
                        overdueUncompletedCount++;
                    }
                }

                if (order.orderStatus !== '已取貨/送達' && order.orderStatus !== '已取消') {
                    // 收集近期訂單 (今天和明天，未完成或未取消的)
                    if (eventTime && eventTime >= todayStart && eventTime < dayAfterTomorrowStart) {
                        recentOrders.push(order);
                    }
                    // 收集所有未完成訂單
                    allPendingOrders.push(order);
                }
            });

            todayPendingOrdersSpan.textContent = todayPendingCount;
            tomorrowDueOrdersSpan.textContent = tomorrowDueCount;
            overdueUncompletedOrdersSpan.textContent = overdueUncompletedCount;

            recentOrders.sort((a, b) => {
                const timeA = a.eventTime ? a.eventTime.getTime() : Infinity;
                const timeB = b.eventTime ? b.eventTime.getTime() : Infinity;
                const createdAtA = new Date(a.createdAt || 0).getTime();
                const createdAtB = new Date(b.createdAt || 0).getTime();
                return timeA - timeB || createdAtA - createdAtB;
            });
            displayOrdersInTable(recentOrders, recentOrdersListDiv, '近期');

            allPendingOrders.sort((a, b) => {
                const timeA = a.eventTime ? a.eventTime.getTime() : Infinity;
                const timeB = b.eventTime ? b.eventTime.getTime() : Infinity;
                const createdAtA = new Date(a.createdAt || 0).getTime();
                const createdAtB = new Date(b.createdAt || 0).getTime();
                return timeA - timeB || createdAtA - createdAtB;
            });
            displayOrdersInTable(allPendingOrders, allPendingOrdersListDiv, '所有');

        } catch (error) {
            console.error('獲取工作台數據失敗：', error);
            recentOrdersListDiv.innerHTML = '<p>無法載入近期訂單。</p>';
            allPendingOrdersListDiv.innerHTML = '<p>無法載入所有未完成訂單。</p>';
        }
    }

    function displayOrdersInTable(orders, containerDiv, type) {
        if (orders.length === 0) {
            containerDiv.innerHTML = `<p>目前沒有${type}訂單。</p>`;
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>訂單號</th>
                    <th>客戶姓名</th>
                    <th>電話</th>
                    <th>蛋糕品項</th>
                    <th>取貨/送貨時間</th>
                    <th>狀態</th>
                    <th>應付金額</th> <th>操作</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        orders.forEach(order => {
            const tr = document.createElement('tr');
            
            const now = new Date();
            const eventTime = order.eventTime; 
            const timeDiff = eventTime ? eventTime.getTime() - now.getTime() : 0;
            const warningThreshold = 24 * 60 * 60 * 1000; 

            if (eventTime && timeDiff <= 0) { 
                tr.classList.add('overdue-order'); 
            } else if (eventTime && timeDiff > 0 && timeDiff <= warningThreshold) {
                tr.classList.add('urgent-order'); 
            }

            // 根據付款狀態顯示或隱藏價格
            const amountDisplay = order.paymentStatus === '已付款' ? '已付清' : (order.totalAmount !== undefined ? order.totalAmount + ' 元' : 'N/A');

            tr.innerHTML = `
                <td>${order.displayId || order.id}</td> 
                <td>${order.customerName}</td>
                <td>${order.customerPhone}</td>
                <td>${order.orderItems.map(item => `${item.cakeType} (${item.cakeSize})`).join('<br>')}</td>
                <td>${eventTime ? eventTime.toLocaleString('zh-TW') : 'N/A'}</td>
                <td>${order.orderStatus}</td>
                <td>${amountDisplay}</td> <td>
                    <button class="action-btn edit-btn" data-id="${order.id}">編輯</button>
                    ${order.orderStatus !== '已取貨/送達' && order.orderStatus !== '已取消' ? `<button class="action-btn mark-completed-btn" data-id="${order.id}">完成取貨</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
        containerDiv.innerHTML = ''; 
        containerDiv.appendChild(table);

        containerDiv.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const orderId = event.target.dataset.id;
                window.location.href = `manage.html#edit=${orderId}`; 
            });
        });

        containerDiv.querySelectorAll('.mark-completed-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const orderId = event.target.dataset.id;
                if (confirm(`確定訂單 ${orderId} 已完成取貨/送達嗎？`)) {
                    markOrderAsDelivered(orderId);
                }
            });
        });
    }

    async function markOrderAsDelivered(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderStatus: '已取貨/送達', completed: true }) 
            });

            if (response.ok) {
                alert('訂單已標記為「已取貨/送達」！');
                fetchDashboardData(); 
            } else {
                const errorText = await response.text();
                alert('更新訂單狀態失敗：' + errorText);
            }
        } catch (error) {
            console.error('標記訂單為已取貨/送達錯誤：', error);
            alert('操作時發生網路錯誤，請稍後再試。');
        }
    }

    fetchDashboardData(); 
});