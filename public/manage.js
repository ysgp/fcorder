document.addEventListener('DOMContentLoaded', () => {
    const orderListContainer = document.getElementById('orderListContainer');
    const editOrderModal = document.getElementById('editOrderModal');
    const editOrderForm = document.getElementById('editOrderForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editOrderIdDisplay = document.getElementById('editOrderIdDisplay');
    const editTotalAmountDisplay = document.getElementById('editTotalAmountDisplay'); // 新增編輯時的總金額顯示

    const editNeedsDeliveryCheckbox = document.getElementById('editNeedsDelivery');
    const editDeliveryInfoDiv = document.getElementById('editDeliveryInfo');
    const editPickupInfoDiv = document.getElementById('editPickupInfo');
    const editDeliveryTimeInput = document.getElementById('editDeliveryTime');
    const editPickupTimeInput = document.getElementById('editPickupTime');
    const editCustomerNameInput = document.getElementById('editCustomerName');
    const editCustomerGenderSelect = document.getElementById('editCustomerGender');
    const editPaymentStatusSelect = document.getElementById('editPaymentStatus'); // 獲取付款狀態選擇器

    // 從伺服器獲取品項選項 (包含價格資訊)
    let productOptions = {
        cakeType: [],
        cakeSize: [],
        cakeFilling: []
    };

    let currentEditingOrderId = null; 

    // 獲取品項選項
    async function fetchProductOptionsForManage() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();

            productOptions = {
                cakeType: [],
                cakeSize: [],
                cakeFilling: []
            };

            products.forEach(product => {
                if (productOptions[product.type]) {
                    productOptions[product.type].push(product);
                }
            });
            console.log('管理頁面品項選項載入成功:', productOptions);
        } catch (error) {
            console.error('載入品項選項失敗：', error);
            alert('無法載入蛋糕品項選項，部分功能可能受限。');
            // 如果載入失敗，提供預設值作為備用 (不含價格，需注意)
            productOptions.cakeType = [{name: "黑森林", price: 800}, {name: "芋泥", price: 750}, {name: "鮮奶油", price: 700}];
            productOptions.cakeSize = [{name: "4吋", price: 0}, {name: "6吋", price: 200}, {name: "8吋", price: 400}, {name: "10吋", price: 600}, {name: "12吋", price: 800}];
            productOptions.cakeFilling = [{name: "水果布丁", price: 0}, {name: "藍莓布丁", price: 0}];
        }
    }

    // 計算單個訂單項目的價格 (用於編輯模式下重新計算)
    function calculateItemPrice(itemType, itemSize, itemFilling) {
        let price = 0;
        const selectedType = productOptions.cakeType.find(p => p.name === itemType);
        const selectedSize = productOptions.cakeSize.find(p => p.name === itemSize);
        const selectedFilling = productOptions.cakeFilling.find(p => p.name === itemFilling); // 儘管目前餡料價格為0

        if (selectedType && typeof selectedType.price === 'number') {
            price += selectedType.price;
        }
        if (selectedSize && typeof selectedSize.price === 'number') {
            price += selectedSize.price;
        }
        if (selectedFilling && typeof selectedFilling.price === 'number') {
            price += selectedFilling.price;
        }
        return price;
    }

    // 新增函數：計算編輯表單的總金額
    function calculateEditTotalAmount() {
        let total = 0;
        document.querySelectorAll('#editOrderItemsContainer .order-item').forEach(itemDiv => {
            const cakeTypeSelect = itemDiv.querySelector('.edit-cake-type');
            const cakeSizeSelect = itemDiv.querySelector('.edit-cake-size');
            const cakeFillingSelect = itemDiv.querySelector('.edit-cake-filling');

            const selectedType = cakeTypeSelect.value;
            const selectedSize = cakeSizeSelect.value;
            const selectedFilling = cakeFillingSelect.value;
            
            total += calculateItemPrice(selectedType, selectedSize, selectedFilling);
        });
        editTotalAmountDisplay.textContent = total;
    }

    async function fetchAndDisplayOrders() {
        await fetchProductOptionsForManage(); // 在獲取訂單前先載入品項

        try {
            const response = await fetch('/api/orders');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const orders = (await response.json()).sort((a, b) => {
                const timeA = a.needsDelivery ? (a.deliveryTime ? new Date(a.deliveryTime).getTime() : Infinity) : (a.pickupTime ? new Date(a.pickupTime).getTime() : Infinity);
                const timeB = b.needsDelivery ? (b.deliveryTime ? new Date(b.deliveryTime).getTime() : Infinity) : (b.pickupTime ? new Date(b.pickupTime).getTime() : Infinity);
                const createdAtA = new Date(a.createdAt || 0).getTime();
                const createdAtB = new Date(b.createdAt || 0).getTime();
                return timeA - timeB || createdAtA - createdAtB; 
            });
            
            orderListContainer.innerHTML = ''; 

            if (orders.length === 0) {
                orderListContainer.innerHTML = '<p>目前沒有任何訂單。</p>';
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
                        <th>付款</th>
                        <th>應付金額</th> <th>狀態</th>
                        <th>備註</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector('tbody');

            orders.forEach(order => {
                const tr = document.createElement('tr');
                
                const now = new Date();
                let eventTime = null;
                if (order.needsDelivery && order.deliveryTime) {
                    eventTime = new Date(order.deliveryTime);
                } else if (!order.needsDelivery && order.pickupTime) {
                    eventTime = new Date(order.pickupTime);
                }

                const timeDiff = eventTime ? eventTime.getTime() - now.getTime() : 0;
                const warningThreshold = 24 * 60 * 60 * 1000; 

                if (order.orderStatus === '已取貨/送達') { 
                    tr.classList.add('completed-order');
                } else if (order.orderStatus === '已取消') {
                    tr.classList.add('canceled-order'); 
                } else if (eventTime && timeDiff <= 0) { 
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
                    <td>${order.paymentStatus}</td>
                    <td>${amountDisplay}</td> <td>${order.orderStatus}</td>
                    <td>${order.notes || ''}</td>
                    <td>
                        <button class="edit-btn" data-id="${order.id}">編輯</button>
                        <button class="delete-btn" data-id="${order.id}">刪除</button>
                        ${order.orderStatus !== '已取貨/送達' && order.orderStatus !== '已取消' ? `<button class="mark-completed-btn" data-id="${order.id}">完成取貨</button>` : ''}
                        ${order.orderStatus !== '已取貨/送達' && order.orderStatus !== '已取消' && order.orderStatus !== '已完成' ? `<button class="complete-btn" data-id="${order.id}">完成製作並列印</button>` : ''}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            orderListContainer.appendChild(table);

            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const orderId = event.target.dataset.id;
                    openEditModal(orderId);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const orderId = event.target.dataset.id;
                    if (confirm(`確定要刪除訂單 ${orderId} 嗎？此操作不可逆！`)) {
                        deleteOrder(orderId);
                    }
                });
            });

            document.querySelectorAll('.mark-completed-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const orderId = event.target.dataset.id;
                    if (confirm(`確定訂單 ${orderId} 已完成取貨/送達嗎？`)) {
                        markOrderAsDelivered(orderId);
                    }
                });
            });

            document.querySelectorAll('.complete-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const orderId = event.target.dataset.id;
                    completeAndPrintOrder(orderId);
                });
            });

            if (window.location.hash.startsWith('#edit=')) {
                const idFromHash = window.location.hash.substring(6);
                openEditModal(idFromHash);
                window.location.hash = ''; 
            }

        } catch (error) {
            console.error('獲取訂單失敗：', error);
            orderListContainer.innerHTML = '<p>無法載入訂單，請稍後再試。</p>';
        }
    }

    async function openEditModal(orderId) {
        try {
            await fetchProductOptionsForManage(); 

            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const order = await response.json();
            
            currentEditingOrderId = orderId;
            editOrderIdDisplay.textContent = `(單號: ${order.displayId || order.id})`; 

            let name = order.customerName;
            let genderSuffix = '';
            if (name.endsWith('先生')) {
                genderSuffix = '先生';
                name = name.slice(0, -2);
            } else if (name.endsWith('小姐')) {
                genderSuffix = '小姐';
                name = name.slice(0, -2);
            }
            editCustomerNameInput.value = name;
            editCustomerGenderSelect.value = genderSuffix;


            document.getElementById('editCustomerPhone').value = order.customerPhone;
            document.getElementById('editCandles').value = order.candles;
            document.getElementById('editPlates').value = order.plates;
            editPaymentStatusSelect.value = order.paymentStatus; // 設置付款狀態
            document.getElementById('editOrderStatus').value = order.orderStatus;
            document.getElementById('editNotes').value = order.notes;

            // 顯示總金額
            editTotalAmountDisplay.textContent = order.totalAmount !== undefined ? order.totalAmount : 'N/A';


            editNeedsDeliveryCheckbox.checked = order.needsDelivery;
            if (order.needsDelivery) {
                editDeliveryInfoDiv.style.display = 'block';
                editPickupInfoDiv.style.display = 'none';
                document.getElementById('editDeliveryAddress').value = order.deliveryAddress;
                editDeliveryTimeInput.value = order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : '';
                editDeliveryTimeInput.setAttribute('required', 'required');
                editPickupTimeInput.removeAttribute('required');
            } else {
                editDeliveryInfoDiv.style.display = 'none';
                editPickupInfoDiv.style.display = 'block';
                editPickupTimeInput.value = order.pickupTime ? new Date(order.pickupTime).toISOString().slice(0, 16) : '';
                editPickupTimeInput.setAttribute('required', 'required');
                editDeliveryTimeInput.removeAttribute('required');
            }

            const editOrderItemsContainer = document.getElementById('editOrderItemsContainer');
            editOrderItemsContainer.innerHTML = '<h3>蛋糕品項</h3>'; 
            order.orderItems.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('order-item');
                itemDiv.innerHTML = `
                    <h4>品項 ${index + 1}</h4>
                    <label>蛋糕種類：</label>
                    <select class="edit-cake-type" required>
                        ${productOptions.cakeType.map(option => `<option value="${option.name}" data-price="${option.price || 0}" ${item.cakeType === option.name ? 'selected' : ''}>${option.name}</option>`).join('')}
                    </select><br><br>

                    <label>尺寸：</label>
                    <select class="edit-cake-size" required>
                        ${productOptions.cakeSize.map(option => `<option value="${option.name}" data-price="${option.price || 0}" ${item.cakeSize === option.name ? 'selected' : ''}>${option.name}</option>`).join('')}
                    </select><br><br>

                    <label>餡料：</label>
                    <select class="edit-cake-filling" required>
                        ${productOptions.cakeFilling.map(option => `<option value="${option.name}" data-price="${option.price || 0}" ${item.cakeFilling === option.name ? 'selected' : ''}>${option.name}</option>`).join('')}
                    </select><br><br>
                `;
                editOrderItemsContainer.appendChild(itemDiv);

                // 為編輯模式下的 select 元素添加 change 事件監聽器，以便重新計算價格
                itemDiv.querySelector('.edit-cake-type').addEventListener('change', calculateEditTotalAmount);
                itemDiv.querySelector('.edit-cake-size').addEventListener('change', calculateEditTotalAmount);
                itemDiv.querySelector('.edit-cake-filling').addEventListener('change', calculateEditTotalAmount);
            });

            calculateEditTotalAmount(); // 初始載入時計算一次總金額

            editOrderModal.style.display = 'flex'; 
        } catch (error) {
            console.error('載入訂單資料失敗：', error);
            alert('無法載入訂單資料進行編輯。');
        }
    }

    editOrderForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const editedOrderItems = [];
        document.querySelectorAll('#editOrderItemsContainer .order-item').forEach(itemDiv => {
            const cakeType = itemDiv.querySelector('.edit-cake-type').value;
            const cakeSize = itemDiv.querySelector('.edit-cake-size').value;
            const cakeFilling = itemDiv.querySelector('.edit-cake-filling').value;
            editedOrderItems.push({ cakeType, cakeSize, cakeFilling });
        });
        
        const editCustomerName = document.getElementById('editCustomerName').value.trim();
        const editCustomerGender = document.getElementById('editCustomerGender').value;
        const totalAmount = parseFloat(editTotalAmountDisplay.textContent); // 獲取編輯後計算的總金額

        const updatedOrderData = {
            orderItems: editedOrderItems,
            customerName: editCustomerName + (editCustomerGender ? editCustomerGender : ''),
            customerPhone: document.getElementById('editCustomerPhone').value,
            candles: document.getElementById('editCandles').value,
            plates: parseInt(document.getElementById('editPlates').value),
            paymentStatus: document.getElementById('editPaymentStatus').value,
            notes: document.getElementById('editNotes').value,
            orderStatus: document.getElementById('editOrderStatus').value,
            needsDelivery: editNeedsDeliveryCheckbox.checked,
            totalAmount: totalAmount // 更新總金額
        };

        if (editNeedsDeliveryCheckbox.checked) {
            updatedOrderData.deliveryAddress = document.getElementById('editDeliveryAddress').value;
            updatedOrderData.deliveryTime = document.getElementById('editDeliveryTime').value;
            updatedOrderData.pickupTime = null; 
        } else {
            updatedOrderData.pickupTime = document.getElementById('editPickupTime').value;
            updatedOrderData.deliveryAddress = ''; 
            updatedOrderData.deliveryTime = null; 
        }

        try {
            const response = await fetch(`/api/orders/${currentEditingOrderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedOrderData)
            });

            if (response.ok) {
                alert('訂單更新成功！');
                editOrderModal.style.display = 'none'; 
                fetchAndDisplayOrders(); 
            } else {
                const errorText = await response.text();
                alert('訂單更新失敗：' + errorText);
            }
        } catch (error) {
            console.error('更新訂單錯誤：', error);
            alert('更新訂單時發生網路錯誤，請稍後再試。');
        }
    });

    editNeedsDeliveryCheckbox.addEventListener('change', () => {
        if (editNeedsDeliveryCheckbox.checked) {
            editDeliveryInfoDiv.style.display = 'block';
            editPickupInfoDiv.style.display = 'none';
            editDeliveryTimeInput.setAttribute('required', 'required');
            editPickupTimeInput.removeAttribute('required');
        } else {
            editDeliveryInfoDiv.style.display = 'none';
            editPickupInfoDiv.style.display = 'block';
            editPickupTimeInput.setAttribute('required', 'required');
            editDeliveryTimeInput.removeAttribute('required');
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        editOrderModal.style.display = 'none';
    });

    async function deleteOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('訂單刪除成功！');
                fetchAndDisplayOrders(); 
            } else {
                const errorText = await response.text();
                alert('訂單刪除失敗：' + errorText);
            }
        } catch (error) {
            console.error('刪除訂單錯誤：', error);
            alert('刪除訂單時發生網路錯誤，請稍後再試。');
        }
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
                fetchAndDisplayOrders(); 
            } else {
                const errorText = await response.text();
                alert('更新訂單狀態失敗：' + errorText);
            }
        } catch (error) {
            console.error('標記訂單為已取貨/送達錯誤：', error);
            alert('操作時發生網路錯誤，請稍後再試。');
        }
    }

    async function completeAndPrintOrder(orderId) {
        if (!confirm(`確定要將訂單 ${orderId} 標記為完成並列印出貨單嗎？`)) {
            return;
        }

        try {
            const updateResponse = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderStatus: '已完成', completed: true }) 
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error('更新訂單狀態失敗：' + errorText);
            }

            const orderResponse = await fetch(`/api/orders/${orderId}`);
            if (!orderResponse.ok) {
                const errorText = await orderResponse.text();
                throw new Error('獲取訂單詳情失敗：' + errorText);
            }
            const orderToPrint = await orderResponse.json();

            // 列印時使用 displayId，並根據付款狀態決定是否顯示金額
            const printAmount = orderToPrint.paymentStatus === '已付款' ? '已付清' : (orderToPrint.totalAmount !== undefined ? orderToPrint.totalAmount + ' 元' : 'N/A');

            let printContent = `
                <h1>鳳城麵包店 - 出貨單</h1>
                <p><strong>訂單號:</strong> ${orderToPrint.displayId || orderToPrint.id}</p> 
                <p><strong>客戶姓名:</strong> ${orderToPrint.customerName}</p>
                <p><strong>電話:</strong> ${orderToPrint.customerPhone}</p>
                <h3>訂單明細:</h3>
                <ul>
                    ${orderToPrint.orderItems.map((item, idx) => 
                        `<li>品項 ${idx + 1}: ${item.cakeType} (${item.cakeSize}, ${item.cakeFilling})</li>`
                    ).join('')}
                </ul>
                <p><strong>蠟燭:</strong> ${orderToPrint.candles}</p>
                <p><strong>盤子組數:</strong> ${orderToPrint.plates} 組</p>
                <p><strong>付款狀態:</strong> ${orderToPrint.paymentStatus}</p>
                <p><strong>應付金額:</strong> ${printAmount}</p> ${orderToPrint.needsDelivery ? 
                    `<p><strong>送貨地址:</strong> ${orderToPrint.deliveryAddress}</p>
                     <p><strong>送貨時間:</strong> ${new Date(orderToPrint.deliveryTime).toLocaleString('zh-TW')}</p>` :
                    `<p><strong>取貨時間:</strong> ${new Date(orderToPrint.pickupTime).toLocaleString('zh-TW')}</p>`
                }
                <p><strong>備註:</strong> ${orderToPrint.notes || '無'}</p>
                <p><strong>訂單建立時間:</strong> ${new Date(orderToPrint.createdAt).toLocaleString('zh-TW')}</p>
                <p><strong>訂單狀態:</strong> ${orderToPrint.orderStatus}</p>
                <br><br>
                <p>------------------ 謝謝惠顧！ ------------------</p>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>出貨單</title>');
            printWindow.document.write('<style>');
            printWindow.document.write(`
                body { font-family: '微軟正黑體', 'Arial', sans-serif; margin: 20px; }
                h1 { text-align: center; color: #333; }
                h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; }
                p, ul { margin-bottom: 5px; }
                ul { list-style: none; padding-left: 0; }
                li { margin-bottom: 3px; }
                @media print {
                    button { display: none; }
                }
            `);
            printWindow.document.write('</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print(); 

            alert('訂單狀態已更新為「已完成」，並已彈出列印頁面。');
            fetchAndDisplayOrders(); 
        } catch (error) {
            console.error('完成訂單或列印失敗：', error);
            alert('完成訂單或列印出貨單時發生錯誤：' + error.message);
        }
    }

    fetchAndDisplayOrders();
});