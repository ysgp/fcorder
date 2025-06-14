document.addEventListener('DOMContentLoaded', () => {
    const addProductForm = document.getElementById('addProductForm');
    const productTypeSelect = document.getElementById('productType');
    const productNameInput = document.getElementById('productName');
    const productPriceField = document.getElementById('productPriceField'); // 新增價格欄位
    const productPriceInput = document.getElementById('productPrice');     // 新增價格輸入框
    const productsListContainer = document.getElementById('productsListContainer');

    const editProductModal = document.getElementById('editProductModal');
    const editProductForm = document.getElementById('editProductForm');
    const editProductTypeInput = document.getElementById('editProductType');
    const editProductNameInput = document.getElementById('editProductName');
    const editProductPriceField = document.getElementById('editProductPriceField'); // 編輯時的價格欄位
    const editProductPriceInput = document.getElementById('editProductPrice');     // 編輯時的價格輸入框
    const cancelEditProductBtn = document.getElementById('cancelEditProductBtn');

    let currentEditingProductId = null; // 儲存當前正在編輯的品項 ID

    // 根據選擇的品項類型顯示/隱藏價格輸入框
    productTypeSelect.addEventListener('change', () => {
        if (productTypeSelect.value === 'cakeType' || productTypeSelect.value === 'cakeSize') {
            productPriceField.style.display = 'block';
            productPriceInput.setAttribute('required', 'required'); // 設為必填
        } else {
            productPriceField.style.display = 'none';
            productPriceInput.removeAttribute('required'); // 移除必填
            productPriceInput.value = ''; // 清空價格
        }
    });

    // 函數：獲取並顯示所有品項
    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            
            productsListContainer.innerHTML = ''; // 清空現有列表

            if (products.length === 0) {
                productsListContainer.innerHTML = '<p>目前沒有任何品項。</p>';
                return;
            }

            // 按類型分組並排序
            const groupedProducts = {
                cakeType: [],
                cakeSize: [],
                cakeFilling: []
            };

            products.forEach(p => {
                if (groupedProducts[p.type]) {
                    groupedProducts[p.type].push(p);
                }
            });

            // 為每個類型創建表格
            for (const type in groupedProducts) {
                if (groupedProducts[type].length > 0) {
                    const typeName = {
                        cakeType: '蛋糕種類',
                        cakeSize: '尺寸',
                        cakeFilling: '餡料'
                    }[type];

                    const sectionDiv = document.createElement('div');
                    sectionDiv.innerHTML = `<h3>${typeName}</h3>`;

                    const table = document.createElement('table');
                    table.innerHTML = `
                        <thead>
                            <tr>
                                <th>名稱</th>
                                ${['cakeType', 'cakeSize'].includes(type) ? '<th>價格</th>' : ''} <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    `;
                    const tbody = table.querySelector('tbody');

                    // 按照名稱排序
                    groupedProducts[type].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));

                    groupedProducts[type].forEach(product => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${product.name}</td>
                            ${['cakeType', 'cakeSize'].includes(type) ? `<td>${product.price !== undefined ? product.price + ' 元' : 'N/A'}</td>` : ''}
                            <td>
                                <button class="product-edit-btn" data-id="${product.id}">編輯</button>
                                <button class="product-delete-btn" data-id="${product.id}">刪除</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                    sectionDiv.appendChild(table);
                    productsListContainer.appendChild(sectionDiv);
                }
            }

            // 為編輯和刪除按鈕添加事件監聽器
            document.querySelectorAll('.product-edit-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const productId = event.target.dataset.id;
                    openEditProductModal(productId);
                });
            });

            document.querySelectorAll('.product-delete-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const productId = event.target.dataset.id;
                    if (confirm(`確定要刪除此品項嗎？此操作不可逆！`)) {
                        deleteProduct(productId);
                    }
                });
            });

        } catch (error) {
            console.error('獲取品項失敗：', error);
            productsListContainer.innerHTML = '<p>無法載入品項，請稍後再試。</p>';
        }
    }

    // 函數：處理新增品項表單提交
    addProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const productType = productTypeSelect.value;
        const productName = productNameInput.value.trim();
        let productPrice = null;

        if (productType === 'cakeType' || productType === 'cakeSize') {
            productPrice = parseFloat(productPriceInput.value);
            if (isNaN(productPrice) || productPrice < 0) {
                alert('請輸入有效的價格，且不可為負值！');
                return;
            }
        }

        if (!productType || !productName) {
            alert('請選擇品項類型並輸入品項名稱！');
            return;
        }

        try {
            const productData = { type: productType, name: productName };
            if (productPrice !== null) { // 只在有價格時加入 price 欄位
                productData.price = productPrice;
            }

            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                alert('品項新增成功！');
                addProductForm.reset(); // 重置表單
                productPriceField.style.display = 'none'; // 隱藏價格欄位
                productPriceInput.removeAttribute('required'); // 移除必填
                productPriceInput.value = ''; // 清空價格
                fetchAndDisplayProducts(); // 重新載入品項列表
            } else {
                const errorText = await response.text();
                alert('品項新增失敗：' + errorText);
            }
        } catch (error) {
            console.error('新增品項錯誤：', error);
            alert('新增品項時發生網路錯誤，請稍後再試。');
        }
    });

    // 函數：開啟編輯品項 Modal
    async function openEditProductModal(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`); // 獲取單個品項詳情
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const product = await response.json();

            currentEditingProductId = productId;
            editProductTypeInput.value = product.type; // 類型不可編輯
            editProductNameInput.value = product.name;

            // 根據品項類型顯示/隱藏價格欄位
            if (product.type === 'cakeType' || product.type === 'cakeSize') {
                editProductPriceField.style.display = 'block';
                editProductPriceInput.setAttribute('required', 'required');
                editProductPriceInput.value = product.price !== undefined ? product.price : '';
            } else {
                editProductPriceField.style.display = 'none';
                editProductPriceInput.removeAttribute('required');
                editProductPriceInput.value = '';
            }

            editProductModal.style.display = 'flex'; // 顯示 Modal
        } catch (error) {
            console.error('載入品項資料失敗：', error);
            alert('無法載入品項資料進行編輯。' + error.message);
        }
    }

    // 函數：處理編輯品項表單提交
    editProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const updatedProductName = editProductNameInput.value.trim();
        const updatedProductType = editProductTypeInput.value; // 獲取類型以判斷是否需要價格
        let updatedProductPrice = null;

        if (!updatedProductName) {
            alert('品項名稱不可為空！');
            return;
        }

        if (updatedProductType === 'cakeType' || updatedProductType === 'cakeSize') {
            updatedProductPrice = parseFloat(editProductPriceInput.value);
            if (isNaN(updatedProductPrice) || updatedProductPrice < 0) {
                alert('請輸入有效的價格，且不可為負值！');
                return;
            }
        }

        try {
            const updatedData = { name: updatedProductName };
            if (updatedProductPrice !== null) {
                updatedData.price = updatedProductPrice;
            } else {
                // 如果是餡料類型，或者從有價格改為無價格（理論上不會發生，但保險起見）
                // 並且 Firestore 允許刪除欄位，可以考慮使用 admin.firestore.FieldValue.delete()
                // 但這裡為了簡化，如果沒有價格就不要傳遞 price 欄位
                // 或者在後端判斷如果是餡料類型則忽略 price 欄位
            }


            const response = await fetch(`/api/products/${currentEditingProductId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                alert('品項更新成功！');
                editProductModal.style.display = 'none'; // 隱藏 Modal
                fetchAndDisplayProducts(); // 重新載入品項列表
            } else {
                const errorText = await response.text();
                alert('品項更新失敗：' + errorText);
            }
        } catch (error) {
            console.error('更新品項錯誤：', error);
            alert('更新品項時發生網路錯誤，請稍後再試。');
        }
    });

    // 取消編輯品項
    cancelEditProductBtn.addEventListener('click', () => {
        editProductModal.style.display = 'none';
    });

    // 函數：刪除品項
    async function deleteProduct(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('品項刪除成功！');
                fetchAndDisplayProducts(); // 重新載入品項列表
            } else {
                const errorText = await response.text();
                alert('品項刪除失敗：' + errorText);
            }
        } catch (error) {
            console.error('刪除品項錯誤：', error);
            alert('刪除品項時發生網路錯誤，請稍後再試。');
        }
    }

    fetchAndDisplayProducts(); // 頁面載入時獲取並顯示品項
});