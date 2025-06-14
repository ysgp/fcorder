document.addEventListener('DOMContentLoaded', () => {
    const orderForm = document.getElementById('orderForm');
    const orderItemsContainer = document.getElementById('orderItemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');
    const orderConfirmationModal = document.getElementById('orderConfirmation');
    const confirmationDetails = document.getElementById('confirmationDetails');
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');
    const editOrderBtn = document.getElementById('editOrderBtn');
    const nameSuffix = document.getElementById('nameSuffix');
    const customerNameInput = document.getElementById('customerName');
    const customerGenderSelect = document.getElementById('customerGender');

    const needsDeliveryCheckbox = document.getElementById('needsDelivery');
    const deliveryInfoDiv = document.getElementById('deliveryInfo');
    const pickupInfoDiv = document.getElementById('pickupInfo');
    const deliveryTimeInput = document.getElementById('deliveryTime');
    const pickupTimeInput = document.getElementById('pickupTime');
    const deliveryAddressInput = document.getElementById('deliveryAddress');
    const totalAmountDisplay = document.getElementById('totalAmountDisplay'); // 新增總金額顯示元素

    let orderItemsCount = 0;
    let currentOrderData = null; // 用來儲存確認前的訂單數據
    
    // 從伺服器獲取品項選項 (包含價格資訊)
    let productOptions = {
        cakeType: [],
        cakeSize: [],
        cakeFilling: []
    };

    async function fetchProductOptions() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();

            // 清空舊的選項
            productOptions = {
                cakeType: [],
                cakeSize: [],
                cakeFilling: []
            };

            // 根據類型分類產品
            products.forEach(product => {
                if (productOptions[product.type]) {
                    productOptions[product.type].push(product);
                }
            });

            // 重新初始化所有品項輸入框
            orderItemsContainer.innerHTML = '<h2>蛋糕品項 <button type="button" id="addItemBtn">＋ 增加品項</button></h2>';
            document.getElementById('addItemBtn').addEventListener('click', addOrderItem);
            addOrderItem(); // 添加初始品項
            
            console.log('品項選項載入成功:', productOptions);
        } catch (error) {
            console.error('載入品項選項失敗：', error);
            alert('無法載入蛋糕品項選項，請聯繫管理員。');
            // 如果載入失敗，可以考慮使用預設值或禁用表單
            // 注意：這裡的預設值不含價格，計算價格會出錯
            productOptions.cakeType = [{name: "黑森林", price: 800}, {name: "芋泥", price: 750}, {name: "鮮奶油", price: 700}];
            productOptions.cakeSize = [{name: "4吋", price: 0}, {name: "6吋", price: 200}, {name: "8吋", price: 400}, {name: "10吋", price: 600}, {name: "12吋", price: 800}]; // 這裡假設尺寸的價格是「加價」
            productOptions.cakeFilling = [{name: "水果布丁", price: 0}, {name: "藍莓布丁", price: 0}];
            addOrderItem(); 
        }
    }


    function addOrderItem() {
        orderItemsCount++;
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('order-item');
        itemDiv.setAttribute('data-item-index', orderItemsCount); 

        const cakeTypeOptionsHtml = productOptions.cakeType.map(option => 
            `<option value="${option.name}" data-price="${option.price || 0}">${option.name}</option>`
        ).join('');
        const cakeSizeOptionsHtml = productOptions.cakeSize.map(option => 
            `<option value="${option.name}" data-price="${option.price || 0}">${option.name}</option>`
        ).join('');
        const cakeFillingOptionsHtml = productOptions.cakeFilling.map(option => 
            `<option value="${option.name}" data-price="${option.price || 0}">${option.name}</option>`
        ).join('');

        itemDiv.innerHTML = `
            <h4>品項 ${orderItemsCount} ${orderItemsCount > 1 ? '<button type="button" class="remove-item-btn">移除</button>' : ''}</h4>
            <label for="cakeType${orderItemsCount}">蛋糕種類：</label>
            <select id="cakeType${orderItemsCount}" class="cake-type-select" required>
                <option value="">請選擇</option>
                ${cakeTypeOptionsHtml}
            </select><br><br>

            <label for="cakeSize${orderItemsCount}">尺寸：</label>
            <select id="cakeSize${orderItemsCount}" class="cake-size-select" required>
                <option value="">請選擇</option>
                ${cakeSizeOptionsHtml}
            </select><br><br>

            <label for="cakeFilling${orderItemsCount}">餡料：</label>
            <select id="cakeFilling${orderItemsCount}" class="cake-filling-select" required>
                <option value="">請選擇</option>
                ${cakeFillingOptionsHtml}
            </select><br><br>
        `;
        orderItemsContainer.appendChild(itemDiv);

        // 為新增的 select 元素添加 change 事件監聽器，以便計算價格
        itemDiv.querySelector('.cake-type-select').addEventListener('change', calculateTotalAmount);
        itemDiv.querySelector('.cake-size-select').addEventListener('change', calculateTotalAmount);
        itemDiv.querySelector('.cake-filling-select').addEventListener('change', calculateTotalAmount);


        if (orderItemsCount > 1) {
            itemDiv.querySelector('.remove-item-btn').addEventListener('click', (event) => {
                event.target.closest('.order-item').remove();
                updateItemNumbers();
                calculateTotalAmount(); // 移除品項後重新計算總價
            });
        }
        calculateTotalAmount(); // 每次新增品項後也計算總價
    }

    function updateItemNumbers() {
        document.querySelectorAll('.order-item').forEach((itemDiv, index) => {
            itemDiv.querySelector('h4').innerHTML = `品項 ${index + 1} ${index > 0 ? '<button type="button" class="remove-item-btn">移除</button>' : ''}`;
            itemDiv.setAttribute('data-item-index', index + 1);
            if (index > 0) {
                itemDiv.querySelector('.remove-item-btn').addEventListener('click', (event) => {
                    event.target.closest('.order-item').remove();
                    updateItemNumbers();
                    calculateTotalAmount();
                });
            }
        });
        orderItemsCount = document.querySelectorAll('.order-item').length;
    }

    // 新增函數：計算總金額
    function calculateTotalAmount() {
        let total = 0;
        document.querySelectorAll('.order-item').forEach(itemDiv => {
            const cakeTypeSelect = itemDiv.querySelector('.cake-type-select');
            const cakeSizeSelect = itemDiv.querySelector('.cake-size-select');
            const cakeFillingSelect = itemDiv.querySelector('.cake-filling-select');

            let itemPrice = 0;

            // 獲取蛋糕種類價格
            const selectedTypeOption = cakeTypeSelect.options[cakeTypeSelect.selectedIndex];
            if (selectedTypeOption && selectedTypeOption.dataset.price) {
                itemPrice += parseFloat(selectedTypeOption.dataset.price);
            }

            // 獲取尺寸價格 (假設為加價)
            const selectedSizeOption = cakeSizeSelect.options[cakeSizeSelect.selectedIndex];
            if (selectedSizeOption && selectedSizeOption.dataset.price) {
                itemPrice += parseFloat(selectedSizeOption.dataset.price);
            }

            // 餡料價格 (如果未來有加價餡料可以加在這裡)
            const selectedFillingOption = cakeFillingSelect.options[cakeFillingSelect.selectedIndex];
            if (selectedFillingOption && selectedFillingOption.dataset.price) {
                itemPrice += parseFloat(selectedFillingOption.dataset.price);
            }

            total += itemPrice;
        });
        totalAmountDisplay.textContent = total;
    }


    customerNameInput.addEventListener('input', updateNameSuffix);
    customerGenderSelect.addEventListener('change', updateNameSuffix);

    function updateNameSuffix() {
        const name = customerNameInput.value.trim();
        const gender = customerGenderSelect.value;
        if (name && gender) {
            nameSuffix.textContent = `(${name}${gender})`;
        } else {
            nameSuffix.textContent = '';
        }
    }

    needsDeliveryCheckbox.addEventListener('change', () => {
        if (needsDeliveryCheckbox.checked) {
            deliveryInfoDiv.style.display = 'block';
            pickupInfoDiv.style.display = 'none';
            deliveryTimeInput.setAttribute('required', 'required');
            deliveryAddressInput.setAttribute('required', 'required');
            pickupTimeInput.removeAttribute('required');
        } else {
            deliveryInfoDiv.style.display = 'none';
            pickupInfoDiv.style.display = 'block';
            pickupTimeInput.setAttribute('required', 'required');
            deliveryTimeInput.removeAttribute('required');
            deliveryAddressInput.removeAttribute('required');
        }
    });

    orderForm.addEventListener('submit', (event) => {
        event.preventDefault(); // 阻止表單預設提交行為

        const orderItems = [];
        document.querySelectorAll('.order-item').forEach(itemDiv => {
            const cakeType = itemDiv.querySelector('[id^="cakeType"]').value;
            const cakeSize = itemDiv.querySelector('[id^="cakeSize"]').value;
            const cakeFilling = itemDiv.querySelector('[id^="cakeFilling"]').value;
            orderItems.push({ cakeType, cakeSize, cakeFilling });
        });

        const customerName = customerNameInput.value.trim();
        const customerGender = customerGenderSelect.value;
        const fullCustomerName = customerName + (customerGender ? customerGender : '');
        const totalAmount = parseFloat(totalAmountDisplay.textContent); // 獲取計算後的總金額

        currentOrderData = {
            orderItems: orderItems,
            customerName: fullCustomerName,
            customerPhone: document.getElementById('customerPhone').value,
            candles: document.getElementById('candles').value,
            plates: parseInt(document.getElementById('plates').value),
            paymentStatus: document.getElementById('paymentStatus').value,
            needsDelivery: needsDeliveryCheckbox.checked,
            deliveryAddress: needsDeliveryCheckbox.checked ? document.getElementById('deliveryAddress').value : '',
            deliveryTime: needsDeliveryCheckbox.checked ? document.getElementById('deliveryTime').value : null,
            pickupTime: !needsDeliveryCheckbox.checked ? document.getElementById('pickupTime').value : null,
            notes: document.getElementById('notes').value,
            orderStatus: "尚未製作", // 預設狀態
            totalAmount: totalAmount // 新增總金額到訂單數據中
        };

        // 顯示確認資訊
        let detailsHtml = '<h3>蛋糕品項：</h3><ul>';
        currentOrderData.orderItems.forEach(item => {
            detailsHtml += `<li>${item.cakeType} (${item.cakeSize}), 餡料: ${item.cakeFilling}</li>`;
        });
        detailsHtml += '</ul>';
        detailsHtml += `
            <h3>客戶資訊：</h3>
            <p><strong>客戶姓名：</strong>${currentOrderData.customerName}</p>
            <p><strong>電話：</strong>${currentOrderData.customerPhone}</p>
            <p><strong>蠟燭：</strong>${currentOrderData.candles}</p>
            <p><strong>盤子組數：</strong>${currentOrderData.plates}</p>
            <p><strong>付款狀態：</strong>${currentOrderData.paymentStatus}</p>
            <p><strong>總金額：</strong>${currentOrderData.totalAmount} 元</p> <p><strong>備註：</strong>${currentOrderData.notes || '無'}</p>
            <p><strong>訂單狀態：</strong>${currentOrderData.orderStatus}</p>
        `;
        if (currentOrderData.needsDelivery) {
            detailsHtml += `
                <p><strong>送貨地址：</strong>${currentOrderData.deliveryAddress}</p>
                <p><strong>送貨時間：</strong>${currentOrderData.deliveryTime ? new Date(currentOrderData.deliveryTime).toLocaleString('zh-TW') : 'N/A'}</p>
            `;
        } else {
            detailsHtml += `
                <p><strong>取貨時間：</strong>${currentOrderData.pickupTime ? new Date(currentOrderData.pickupTime).toLocaleString('zh-TW') : 'N/A'}</p>
            `;
        }

        confirmationDetails.innerHTML = detailsHtml;
        orderConfirmationModal.style.display = 'flex'; // 顯示 Modal
    });

    confirmOrderBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentOrderData)
            });

            if (response.ok) {
                const result = await response.json();
                alert(`訂單建立成功！訂單號：${result.displayId}`); 
                orderForm.reset(); // 重置表單
                orderItemsContainer.innerHTML = '<h2>蛋糕品項 <button type="button" id="addItemBtn">＋ 增加品項</button></h2>'; // 清空品項
                document.getElementById('addItemBtn').addEventListener('click', addOrderItem); // 重新綁定
                fetchProductOptions(); // 重新載入品項並添加初始品項
                needsDeliveryCheckbox.checked = false; // 重置送貨選項
                deliveryInfoDiv.style.display = 'none';
                pickupInfoDiv.style.display = 'block'; // 預設顯示取貨資訊
                pickupTimeInput.setAttribute('required', 'required'); // 確保取貨時間為必填
                deliveryTimeInput.removeAttribute('required');
                deliveryAddressInput.removeAttribute('required');
                updateNameSuffix(); // 清空性別後綴顯示
                calculateTotalAmount(); // 重置總金額顯示為 0
            } else {
                const errorText = await response.text();
                alert('建立訂單失敗：' + errorText);
            }
        } catch (error) {
            console.error('建立訂單錯誤：', error);
            alert('建立訂單時發生網路錯誤，請稍後再試。');
        } finally {
            orderConfirmationModal.style.display = 'none'; // 無論成功失敗都隱藏 Modal
        }
    });

    editOrderBtn.addEventListener('click', () => {
        orderConfirmationModal.style.display = 'none'; // 隱藏 Modal 返回編輯表單
    });

    // 初始化載入品項並添加一個預設品項
    fetchProductOptions(); 
    // updateNameSuffix(); // 首次載入時清空性別後綴顯示 (在 fetchProductOptions 內被觸發)
});