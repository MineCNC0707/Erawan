const DataManager = {
  _products: null,
  _purchases: null,
  _outbound: null,
  _categories: null,
  _storeroomNames: null,
  _productIdCounter: null,

  get products() {
    return this._get("products");
  },
  set products(val) {
    this._set("products", val);
  },
  get purchases() {
    return this._get("purchases");
  },
  set purchases(val) {
    this._set("purchases", val);
  },
  get outbound() {
    return this._get("outbound");
  },
  set outbound(val) {
    this._set("outbound", val);
  },

  get categories() {
    if (!this._categories) {
      this._categories = JSON.parse(localStorage.getItem("categories")) || [
        "饮料",
        "食品",
        "日用品",
        "其他",
      ];
    }
    return this._categories;
  },
  set categories(val) {
    this._categories = val;
    localStorage.setItem("categories", JSON.stringify(val));
  },

  get storeroomNames() {
    if (!this._storeroomNames) {
      this._storeroomNames = JSON.parse(
        localStorage.getItem("storeroomNames")
      ) || {
        1: "Store 1",
        2: "Store 2",
        3: "Store 3",
        4: "Store 4",
        5: "Store 5",
      };
    }
    return this._storeroomNames;
  },
  set storeroomNames(val) {
    this._storeroomNames = val;
    localStorage.setItem("storeroomNames", JSON.stringify(val));
  },

  get productIdCounter() {
    return parseInt(localStorage.getItem("productIdCounter")) || 1;
  },
  set productIdCounter(val) {
    localStorage.setItem("productIdCounter", val);
  },

  _get(key) {
    if (!this["_" + key]) {
      let data = JSON.parse(localStorage.getItem(key)) || [];
      if (key === "products") {
        data.forEach((p) => {
          if (!p.storerooms)
            p.storerooms = { 1: p.stock || 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          if (!p.batches) p.batches = [];
          if (!p.boxSize) p.boxSize = 1;
          if (!p.unitName) p.unitName = "个";
          if (!p.boxUnitName) p.boxUnitName = "箱";
          p.stock = Object.values(p.storerooms).reduce((a, b) => a + b, 0);
        });
      }
      this["_" + key] = data;
    }
    return this["_" + key];
  },
  _set(key, val) {
    this["_" + key] = val;
    localStorage.setItem(key, JSON.stringify(val));
  },

  saveAll() {
    this._set("products", this.products);
    this._set("purchases", this.purchases);
    this._set("outbound", this.outbound);
    localStorage.setItem("categories", JSON.stringify(this.categories));
    localStorage.setItem("storeroomNames", JSON.stringify(this.storeroomNames));
    localStorage.setItem("productIdCounter", this.productIdCounter);
  },

  refresh() {
    this._products = null;
    this._purchases = null;
    this._outbound = null;
    this._categories = null;
    this._storeroomNames = null;
  },
};

const Utils = {
  formatCurrency: (amount) => "RM " + parseFloat(amount || 0).toFixed(2),
  formatDate: (str) => {
    const d = str ? new Date(str) : new Date();
    return d.toLocaleDateString("zh-CN", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  },
  showToast: (msg, type = "success") => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon =
      type === "success" ? "ri-checkbox-circle-fill" : "ri-error-warning-fill";
    toast.innerHTML = `<i class="${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "slideInRight 0.3s reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  updateTotalStock: (product) => {
    const stores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    product.batches.forEach((b) => {
      stores[b.storeId] = (stores[b.storeId] || 0) + b.qty;
    });
    product.storerooms = stores;
    product.stock = Object.values(product.storerooms).reduce(
      (a, b) => a + parseInt(b),
      0
    );
  },
  formatStockDisplay: (qty, product) => {
    const boxSize = parseInt(product.boxSize) || 1;
    const unit = product.unitName || "个";
    const boxUnit = product.boxUnitName || "箱";
    const quantity = parseInt(qty) || 0;

    if (boxSize <= 1) {
      return `<span style="font-weight:600">${quantity}</span> <span style="font-size:11px;color:#888">${unit}</span>`;
    }
    const boxes = Math.floor(quantity / boxSize);
    const pieces = quantity % boxSize;
    let html = "";
    if (boxes > 0) {
      html += `<span style="color:#1677ff;font-weight:600">${boxes}</span><span style="font-size:11px;color:#1677ff;margin-right:4px">${boxUnit}</span>`;
    }
    if (pieces > 0 || quantity === 0) {
      html += `<span style="font-weight:600;margin-left:2px">${pieces}</span><span style="font-size:11px;color:#666">${unit}</span>`;
    }
    return html || `<span style="color:#ccc">0</span>`;
  },
  setupSearchableInput: (
    wrapperId,
    products,
    onSelectCallback,
    currentStoreId = null
  ) => {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const input = wrapper.querySelector('input[type="text"]');
    const hidden = wrapper.querySelector('input[type="hidden"]');
    let list = wrapper.querySelector(".search-results");

    if (!list) {
      list = document.createElement("div");
      list.className = "search-results";
      wrapper.appendChild(list);
    }
    const closeList = () => (list.style.display = "none");
    const renderList = (filterText = "") => {
      list.innerHTML = "";
      const lowerFilter = filterText.toLowerCase();
      let filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerFilter) ||
          (p.code && p.code.toLowerCase().includes(lowerFilter))
      );
      filtered.sort((a, b) =>
        a.name.localeCompare(b.name, "zh-CN", { numeric: true })
      );
      if (filtered.length === 0) {
        list.innerHTML = `<div class="no-result">无匹配商品</div>`;
        list.style.display = "block";
        return;
      }
      filtered.slice(0, 50).forEach((p) => {
        const item = document.createElement("div");
        item.className = "result-item";
        let stockHtml = "";
        let isOutOfStock = false;
        if (currentStoreId) {
          const sQty = p.storerooms[currentStoreId] || 0;
          stockHtml = `剩: ${Utils.formatStockDisplay(sQty, p)}`;
          if (sQty <= 0) {
            item.classList.add("out-of-stock");
            isOutOfStock = true;
          }
        } else {
          stockHtml = `总存: ${Utils.formatStockDisplay(p.stock, p)}`;
        }
        item.innerHTML = `<div class="prod-name">${p.name}<span class="prod-tag">${p.category}</span></div><div class="prod-meta">${stockHtml}</div>`;
        item.onclick = () => {
          input.value = p.name;
          hidden.value = p.id;
          closeList();
          input.blur();
          if (onSelectCallback) onSelectCallback(p);
        };
        list.appendChild(item);
      });
      list.style.display = "block";
    };
    input.onfocus = () => renderList(input.value);
    input.oninput = () => renderList(input.value);
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) closeList();
    });
  },
};

// 分类管理
function loadCategoryOptions() {
  const select = document.getElementById("productCategory");
  const filterSelect = document.getElementById("filterCategorySelect");
  if (select)
    select.innerHTML = DataManager.categories
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  if (filterSelect)
    filterSelect.innerHTML =
      `<option value="">所有分类</option>` +
      DataManager.categories
        .map((c) => `<option value="${c}">${c}</option>`)
        .join("");
}
function openCategoryModal() {
  document.getElementById("categoryModal").style.display = "block";
  renderCategoryList();
}
function closeCategoryModal() {
  document.getElementById("categoryModal").style.display = "none";
  loadCategoryOptions();
}
function renderCategoryList() {
  const list = document.getElementById("categoryList");
  list.innerHTML = DataManager.categories
    .map(
      (c, index) => `
    <li><span>${c}</span><button class="btn btn-xs btn-danger" onclick="deleteCategory(${index})"><i class="ri-delete-bin-line"></i></button></li>
  `
    )
    .join("");
}
function addNewCategory() {
  const input = document.getElementById("newCategoryInput");
  const val = input.value.trim();
  if (val && !DataManager.categories.includes(val)) {
    DataManager.categories.push(val);
    DataManager.categories = DataManager.categories;
    input.value = "";
    renderCategoryList();
    Utils.showToast("分类已添加");
  } else {
    Utils.showToast("无效或重复分类", "error");
  }
}
function deleteCategory(index) {
  if (confirm("确定删除该分类？")) {
    DataManager.categories.splice(index, 1);
    DataManager.categories = DataManager.categories;
    renderCategoryList();
  }
}

// 商品管理
function saveProduct(e) {
  e.preventDefault();
  const idStr = document.getElementById("editProductId").value;
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const costPrice = parseFloat(
    document.getElementById("productCostPrice").value
  );
  const stockInput =
    parseInt(document.getElementById("productStock").value) || 0;
  const boxSize =
    parseInt(document.getElementById("productBoxSize").value) || 1;
  const unitName =
    document.getElementById("productUnitName").value.trim() || "个";
  const boxUnitName =
    document.getElementById("productBoxUnitName").value.trim() || "箱";

  if (idStr) {
    const id = parseInt(idStr);
    let product = DataManager.products.find((p) => p.id === id);
    if (product) {
      product.name = name;
      product.category = category;
      product.costPrice = costPrice;
      product.boxSize = boxSize;
      product.unitName = unitName;
      product.boxUnitName = boxUnitName;
      if (stockInput !== 0) {
        product.batches.push({
          storeId: 1,
          qty: stockInput,
          cost: costPrice,
          date: new Date().toISOString(),
          remark: "库存调整",
        });
        Utils.updateTotalStock(product);
      }
      Utils.showToast("商品已更新");
    }
  } else {
    if (DataManager.products.find((p) => p.name === name)) {
      alert("商品名称已存在");
      return;
    }
    let product = {
      id: DataManager.productIdCounter++,
      code: String(DataManager.productIdCounter).padStart(5, "0"),
      name,
      category,
      costPrice,
      boxSize,
      unitName,
      boxUnitName,
      stock: 0,
      storerooms: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      batches: [],
      createdAt: new Date().toISOString(),
    };
    if (stockInput > 0) {
      product.batches.push({
        storeId: 1,
        qty: stockInput,
        cost: costPrice,
        date: new Date().toISOString(),
        remark: "初始库存",
      });
    }
    Utils.updateTotalStock(product);
    DataManager.products.push(product);
    Utils.showToast("新商品添加成功");
  }
  DataManager.saveAll();
  loadProducts();
  loadStoreroomDashboard();
  resetProductForm();
}
function deductStock(product, storeId, qtyToDeduct) {
  let batches = product.batches
    .filter((b) => b.storeId === storeId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let remaining = qtyToDeduct;
  let totalCost = 0;
  for (let b of batches) {
    if (remaining <= 0) break;
    let original = product.batches.find((ob) => ob === b);
    if (!original) continue;
    if (original.qty > remaining) {
      totalCost += remaining * original.cost;
      original.qty -= remaining;
      remaining = 0;
    } else {
      totalCost += original.qty * original.cost;
      remaining -= original.qty;
      product.batches = product.batches.filter((item) => item !== original);
    }
  }
  Utils.updateTotalStock(product);
  return { success: remaining === 0, cost: totalCost };
}
function editProduct(id) {
  const p = DataManager.products.find((p) => p.id === id);
  if (!p) return;
  document.getElementById("editProductId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productCategory").value = p.category;
  document.getElementById("productCostPrice").value = p.costPrice;
  document.getElementById("productStock").value = 0;
  document.getElementById("productBoxSize").value = p.boxSize || 1;
  document.getElementById("productUnitName").value = p.unitName || "个";
  document.getElementById("productBoxUnitName").value = p.boxUnitName || "箱";
  const btn = document.getElementById("saveBtn");
  btn.innerText = "确认更新";
  btn.classList.add("btn-success");
  document.getElementById("stockLabel").innerText = "库存调整 (Store 1)";

  const formPanel = document.querySelector(".form-panel");
  formPanel.scrollIntoView({ behavior: "smooth", block: "start" });

  if (window.innerWidth <= 768) {
    setTimeout(() => {
      window.scrollTo({ top: formPanel.offsetTop - 70, behavior: "smooth" });
    }, 100);
  }
}
function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("editProductId").value = "";
  document.getElementById("productBoxSize").value = "1";
  document.getElementById("productUnitName").value = "个";
  document.getElementById("productBoxUnitName").value = "箱";
  const btn = document.getElementById("saveBtn");
  btn.innerText = "保存商品";
  btn.classList.remove("btn-success");
  document.getElementById("stockLabel").innerText = "初始库存 (Store 1)";
}
function deleteProduct(id) {
  if (confirm("确定删除该商品？")) {
    DataManager.products = DataManager.products.filter((p) => p.id !== id);
    DataManager.saveAll();
    loadProducts();
    Utils.showToast("已删除", "error");
  }
}
function loadProducts() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;
  const filterCat = document.getElementById("filterCategorySelect").value;
  let list = [...DataManager.products].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN", { numeric: true })
  );
  if (filterCat) list = list.filter((p) => p.category === filterCat);

  tbody.innerHTML = list
    .map((p) => {
      const boxCost = (p.costPrice || 0) * (p.boxSize || 1);
      const unit = p.unitName || "个";
      const boxUnit = p.boxUnitName || "箱";
      let priceDisplay = `<div style="font-weight:600">${Utils.formatCurrency(
        boxCost
      )} <span style="font-size:11px;color:#888">/${boxUnit}</span></div><div style="font-size:12px;color:#555">${Utils.formatCurrency(
        p.costPrice
      )} /${unit}</div>`;

      return `<tr>
        <td data-label="商品名称"><b>${p.name}</b></td>
        <td data-label="分类"><span class="badge">${p.category}</span></td>
        <td data-label="箱规">${
          p.boxSize > 1 ? `1${boxUnit} = ${p.boxSize}${unit}` : "-"
        }</td>
        <td data-label="价格">${priceDisplay}</td>
        <td data-label="总库存">${Utils.formatStockDisplay(p.stock, p)}</td>
        <td data-label="操作" class="text-right">
          <button class="btn btn-xs btn-outline" onclick="editProduct(${
            p.id
          })"><i class="ri-edit-line"></i> 编辑</button>
          <button class="btn btn-xs btn-danger" onclick="deleteProduct(${
            p.id
          })"><i class="ri-delete-bin-line"></i></button>
        </td>
      </tr>`;
    })
    .join("");
  updateProductList();
}

// 进货功能 (新增逻辑：单位处理)
function setPurchaseDateToNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById("purchaseTimeInput").value = now
    .toISOString()
    .slice(0, 16);
}

// 当选择商品时，自动更新单位选项
function onPurchaseProductSelect(product) {
  // 填充价格
  document.getElementById("purchasePrice").value = product.costPrice || 0;

  // 填充单位选择
  const unitSelect = document.getElementById("purchaseUnitType");
  const unit = product.unitName || "个";
  const boxUnit = product.boxUnitName || "箱";
  const boxSize = parseInt(product.boxSize) || 1;

  let html = `<option value="piece">${unit}</option>`;
  if (boxSize > 1) {
    html += `<option value="box">${boxUnit} (含 ${boxSize} ${unit})</option>`;
  }
  unitSelect.innerHTML = html;
  unitSelect.value = "piece";
}

function onPurchaseUnitChange() {
  // 占位，预留后续扩展（如切换单位时自动计算总价）
}

function quickPurchase(e) {
  e.preventDefault();
  const hiddenId = document.querySelector(
    "#purchaseSearchWrapper input[type='hidden']"
  );
  const nameInput = document.querySelector(
    "#purchaseSearchWrapper input[type='text']"
  );
  const name = nameInput.value.trim();
  const productId = parseInt(hiddenId.value);
  const inputQty = parseInt(document.getElementById("purchaseQuantity").value); // 用户输入的数量
  const inputPrice = parseFloat(document.getElementById("purchasePrice").value); // 用户输入的单价（箱价或个价）
  const storeId = parseInt(document.getElementById("purchaseStoreroom").value);
  const unitType = document.getElementById("purchaseUnitType").value; // piece or box
  const time =
    document.getElementById("purchaseTimeInput").value ||
    new Date().toISOString();

  let product = productId
    ? DataManager.products.find((p) => p.id === productId)
    : null;

  // 创建新商品逻辑（如果是新商品，默认单位为个）
  if (!product) {
    if (confirm(`商品 "${name}" 不存在，是否创建？`)) {
      product = {
        id: DataManager.productIdCounter++,
        name,
        code: String(DataManager.productIdCounter).padStart(5, "0"),
        category: "其他",
        costPrice: inputPrice,
        stock: 0,
        boxSize: 1,
        unitName: "个",
        boxUnitName: "箱",
        storerooms: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        batches: [],
      };
      DataManager.products.push(product);
    } else return;
  }

  // 计算实际入库数量和单成本
  let actualQtyToAdd = inputQty;
  let costPerPiece = inputPrice;
  let unitDisplayName = product.unitName || "个";

  // 如果选的是箱，且商品有箱规
  if (unitType === "box" && product.boxSize > 1) {
    actualQtyToAdd = inputQty * product.boxSize;
    costPerPiece = inputPrice / product.boxSize;
    unitDisplayName = product.boxUnitName || "箱";
  }

  const batchId = "B_" + Date.now();
  // 批次记录总是存单个数量和单价
  product.batches.push({
    batchId,
    storeId,
    qty: actualQtyToAdd,
    cost: costPerPiece,
    date: time,
    remark: "进货",
  });

  // 更新商品参考进价 (总是更新为最新的单件成本)
  product.costPrice = costPerPiece;
  Utils.updateTotalStock(product);

  DataManager.purchases.push({
    id: Date.now(),
    batchId,
    productId: product.id,
    productName: product.name,
    storeroomId: storeId,
    quantity: inputQty, // 记录显示的输入数量
    unitStr: unitDisplayName, // 记录单位字符串
    price: inputPrice, // 记录当时输入的单价/箱价
    total: inputQty * inputPrice,
    time,
  });

  DataManager.saveAll();
  document.getElementById("purchaseForm").reset();
  hiddenId.value = "";
  nameInput.value = "";
  // 重置单位选择框
  document.getElementById("purchaseUnitType").innerHTML =
    '<option value="piece">个</option>';

  setPurchaseDateToNow();
  loadPurchases();
  loadProducts();
  Utils.showToast("进货成功");
}

function deletePurchase(id) {
  const p = DataManager.purchases.find((x) => x.id === id);
  if (!p || !confirm("删除将尝试扣除对应库存，确定吗？")) return;
  const prod = DataManager.products.find((x) => x.id === p.productId);
  if (prod && p.batchId) {
    const bIdx = prod.batches.findIndex((b) => b.batchId === p.batchId);
    if (bIdx !== -1) {
      prod.batches.splice(bIdx, 1);
      Utils.updateTotalStock(prod);
    }
  }
  DataManager.purchases = DataManager.purchases.filter((x) => x.id !== id);
  DataManager.saveAll();
  loadPurchases();
  loadProducts();
}
function loadPurchases() {
  const tbody = document.getElementById("purchaseTableBody");
  const list = DataManager.purchases
    .slice()
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 50);
  tbody.innerHTML = list.length
    ? list
        .map((p) => {
          return `<tr>
            <td data-label="时间">${Utils.formatDate(p.time)}</td>
            <td data-label="仓库">${
              DataManager.storeroomNames[p.storeroomId]
            }</td>
            <td data-label="商品">${p.productName}</td>
            <td data-label="数量"><b>${p.quantity}</b> ${p.unitStr || "个"}</td>
            <td data-label="单价">${Utils.formatCurrency(p.price)} /${
            p.unitStr || "个"
          }</td>
            <td data-label="总额" style="color:#1677ff;font-weight:600">${Utils.formatCurrency(
              p.total
            )}</td>
            <td data-label="操作"><button class="btn btn-xs btn-outline" onclick="deletePurchase(${
              p.id
            })">删除</button></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="7" class="text-center">暂无记录</td></tr>`;
}

// 出货
let currentOutboundItems = [];
function onOutboundProductChange(product) {
  if (!product) return;
  document.getElementById("outboundQuantityInput").value = 1;
  const unitSelect = document.getElementById("outboundUnitType");
  const mpInput = document.getElementById("outboundUnitMultiplier");
  const priceInput = document.getElementById("outboundSellingPrice");

  const unit = product.unitName || "个";
  const boxUnit = product.boxUnitName || "箱";
  const boxSize = parseInt(product.boxSize) || 1;

  let html = `<option value="piece">${unit}</option>`;
  if (boxSize > 1) {
    html += `<option value="box">${boxUnit} (含 ${boxSize} ${unit})</option>`;
  }
  html += `<option value="other">自定义</option>`;
  unitSelect.innerHTML = html;
  unitSelect.value = "piece";
  mpInput.value = 1;
  mpInput.readOnly = true;

  // 默认填充成本价 (按单个)
  priceInput.value = product.costPrice || 0;
}

function onOutboundUnitChange() {
  const type = document.getElementById("outboundUnitType").value;
  const mpInput = document.getElementById("outboundUnitMultiplier");
  const priceInput = document.getElementById("outboundSellingPrice");
  const hiddenId = document.querySelector(
    "#outboundSearchWrapper input[type='hidden']"
  ).value;
  const product = DataManager.products.find((p) => p.id == hiddenId);
  if (!product) return;

  if (type === "piece") {
    mpInput.value = 1;
    mpInput.readOnly = true;
    priceInput.value = product.costPrice || 0;
  } else if (type === "box") {
    const bSize = product.boxSize || 1;
    mpInput.value = bSize;
    mpInput.readOnly = true;
    // 如果选了箱，建议售价自动乘以箱规
    priceInput.value = (product.costPrice || 0) * bSize;
  } else {
    mpInput.readOnly = false;
    mpInput.focus();
    // 自定义单位，保持单价为基础，或者用户自己填
    priceInput.value = product.costPrice || 0;
  }
}
function adjQty(delta) {
  const input = document.getElementById("outboundQuantityInput");
  let val = Math.max(1, (parseInt(input.value) || 0) + delta);
  input.value = val;
}
function addOutboundItem() {
  const hiddenInput = document.querySelector(
    "#outboundSearchWrapper input[type='hidden']"
  );
  if (!hiddenInput || !hiddenInput.value)
    return Utils.showToast("请先选择商品", "error");
  const productId = parseInt(hiddenInput.value);
  const storeId = parseInt(document.getElementById("outboundStoreroom").value);
  const product = DataManager.products.find((p) => p.id === productId);
  if (!product) return;
  const unitType = document.getElementById("outboundUnitType").value;
  const multiplier =
    parseInt(document.getElementById("outboundUnitMultiplier").value) || 1;
  const inputQty =
    parseInt(document.getElementById("outboundQuantityInput").value) || 1;
  const sellingPrice =
    parseFloat(document.getElementById("outboundSellingPrice").value) || 0;

  const deductionQty = inputQty * multiplier;
  const currentStock = product.storerooms[storeId] || 0;
  const cartUsed = currentOutboundItems
    .filter((i) => i.productId === productId && i.storeroomId === storeId)
    .reduce((a, b) => a + b.deductionQty, 0);
  if (currentStock - cartUsed < deductionQty) {
    return Utils.showToast("库存不足！", "error");
  }

  let displayUnit = "";
  if (unitType === "piece") displayUnit = product.unitName || "个";
  else if (unitType === "box") displayUnit = product.boxUnitName || "箱";
  else displayUnit = `自定义(x${multiplier})`;

  currentOutboundItems.push({
    id: Date.now() + Math.random(),
    productId,
    storeroomId: storeId,
    productName: product.name,
    inputQty,
    deductionQty,
    unitName: displayUnit,
    sellingPrice: sellingPrice, // 记录单价 (基于所选单位)
    totalSales: sellingPrice * inputQty, // 记录该行总售价
    estimatedValue: deductionQty * (product.costPrice || 0), // 依旧记录成本以计算毛利（后台保留）
  });
  updateOutboundItemsDisplay();
  document.querySelector("#outboundSearchWrapper input[type='text']").value =
    "";
  hiddenInput.value = "";
  document.getElementById("outboundQuantityInput").value = 1;
  document.getElementById("outboundSellingPrice").value = "";
  document.querySelector("#outboundSearchWrapper input[type='text']").focus();
  Utils.showToast("已加入清单");
}
function removeOutboundItem(id) {
  currentOutboundItems = currentOutboundItems.filter((i) => i.id !== id);
  updateOutboundItemsDisplay();
}
function updateOutboundItemsDisplay() {
  const container = document.getElementById("outboundItemsContainer");
  const footer = document.getElementById("outboundFooter");
  document.getElementById(
    "outboundCount"
  ).innerText = `${currentOutboundItems.length} 项`;
  footer.style.display = currentOutboundItems.length ? "block" : "none";
  container.innerHTML = currentOutboundItems.length
    ? currentOutboundItems
        .map(
          (item) => `
    <div class="sales-item">
        <div class="sales-item-info"><strong>${
          item.productName
        }</strong><div><span class="badge">${item.inputQty} ${
            item.unitName
          }</span> <span style="font-size:12px;color:#666">@ ${Utils.formatCurrency(
            item.sellingPrice
          )}</span></div>
        <div style="font-size:10px;color:#666">从 ${
          DataManager.storeroomNames[item.storeroomId]
        }</div></div>
        <div style="text-align:right">
          <div style="font-weight:600;color:#1677ff">${Utils.formatCurrency(
            item.totalSales
          )}</div>
          <div style="color:#ff4d4f;cursor:pointer;margin-top:4px" onclick="removeOutboundItem(${
            item.id
          })"><i class="ri-close-circle-fill"></i></div>
        </div>
    </div>`
        )
        .join("")
    : `<div class="empty-cart"><p>暂无出货项</p></div>`;
}
function clearOutboundItems() {
  if (confirm("清空列表？")) {
    currentOutboundItems = [];
    updateOutboundItemsDisplay();
  }
}
function confirmOutbound() {
  if (!currentOutboundItems.length) return;
  const time =
    document.getElementById("outboundTime").value || new Date().toISOString();
  const remark = document.getElementById("outboundRemark").value;
  const groupId = Date.now();
  currentOutboundItems.forEach((item) => {
    let p = DataManager.products.find((x) => x.id === item.productId);
    deductStock(p, item.storeroomId, item.deductionQty);
    DataManager.outbound.push({
      id: Date.now() + Math.random(),
      groupId,
      productId: item.productId,
      productName: item.productName,
      storeroomId: item.storeroomId,
      quantity: item.inputQty,
      unitName: item.unitName,
      deductedQty: item.deductionQty,
      sellingPrice: item.sellingPrice,
      totalSales: item.totalSales,
      totalValue: item.estimatedValue, // cost value
      time,
      remark,
    });
  });
  DataManager.saveAll();
  showOutboundReceipt(groupId, currentOutboundItems, time, remark);
  currentOutboundItems = [];
  document.getElementById("outboundRemark").value = "";
  updateOutboundItemsDisplay();
  refreshAllViews();
  Utils.showToast("出货完成", "success");
}
function loadOutboundHistory() {
  const list = DataManager.outbound
    .slice()
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 50);
  document.getElementById("outboundTableBody").innerHTML = list.length
    ? list
        .map((s) => {
          // 兼容旧数据，如果没有 totalSales，就显示成本 value
          const salesAmount =
            s.totalSales !== undefined ? s.totalSales : s.totalValue;
          const unitPrice =
            s.sellingPrice !== undefined
              ? s.sellingPrice
              : s.totalValue / (s.quantity || 1);

          return `<tr>
            <td data-label="时间">${Utils.formatDate(s.time)}</td>
            <td data-label="仓库">${
              DataManager.storeroomNames[s.storeroomId]
            }</td>
            <td data-label="商品">${s.productName}</td>
            <td data-label="数量"><b>${s.quantity}</b> ${s.unitName}</td>
            <td data-label="出货单价" style="color:#666">${Utils.formatCurrency(
              unitPrice
            )}</td>
            <td data-label="销售总额" style="color:#f97316;font-weight:600">${Utils.formatCurrency(
              salesAmount
            )}</td>
            <td data-label="操作"><button class="btn btn-xs btn-outline" onclick="deleteOutbound(${
              s.id
            })">撤销</button></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="7" class="text-center">暂无记录</td></tr>`;
}
function deleteOutbound(id) {
  if (!confirm("撤销出货将恢复库存，确定吗？")) return;
  const rec = DataManager.outbound.find((s) => s.id === id);
  if (rec) {
    const prod = DataManager.products.find((p) => p.id === rec.productId);
    if (prod) {
      prod.batches.push({
        storeId: rec.storeroomId || 1,
        qty: rec.deductedQty,
        cost: prod.costPrice,
        date: new Date().toISOString(),
        remark: "撤销恢复",
      });
      Utils.updateTotalStock(prod);
    }
    DataManager.outbound = DataManager.outbound.filter((s) => s.id !== id);
    DataManager.saveAll();
    refreshAllViews();
    Utils.showToast("已撤销");
  }
}

// 仓库监控
function loadStoreroomDashboard() {
  const stats = {
    1: { q: 0, v: 0 },
    2: { q: 0, v: 0 },
    3: { q: 0, v: 0 },
    4: { q: 0, v: 0 },
    5: { q: 0, v: 0 },
  };
  DataManager.products.forEach((p) => {
    p.batches.forEach((b) => {
      if (stats[b.storeId]) {
        stats[b.storeId].q += b.qty;
        stats[b.storeId].v += b.qty * b.cost;
      }
    });
  });
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`st${i}-name`).innerText =
      DataManager.storeroomNames[i];
    document.getElementById(`st${i}-qty`).innerText = stats[i].q;
    document.getElementById(`st${i}-val`).innerText = Utils.formatCurrency(
      stats[i].v
    );
  }
}
function renameStoreroom(e, id) {
  e.stopPropagation();
  const name = prompt("新名称:", DataManager.storeroomNames[id]);
  if (name) {
    DataManager.storeroomNames[id] = name;
    DataManager.storeroomNames = DataManager.storeroomNames;
    refreshAllViews();
  }
}
function loadStoreroomDetail(id) {
  document
    .querySelectorAll(".store-card")
    .forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".store-card")[id - 1].classList.add("active");
  document.getElementById(
    "currentStoreTitle"
  ).innerText = `${DataManager.storeroomNames[id]} 详情`;
  const list = DataManager.products.filter((p) => p.storerooms[id] > 0);
  list.sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }));
  document.getElementById("storeroomTableBody").innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<tr><td><b>${p.name}</b></td><td>${
              p.category
            }</td><td>-</td><td>${Utils.formatStockDisplay(
              p.storerooms[id],
              p
            )}</td><td>${Utils.formatCurrency(p.costPrice)}</td><td>-</td></tr>`
        )
        .join("")
    : `<tr><td colspan="6" class="text-center">该仓库暂无存货</td></tr>`;
}

// 报表
let chartInstance = null;
function renderTrendChart(range) {
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;
  const days = range === "week" ? 7 : 30;
  const labels = [],
    inData = [],
    outData = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    inData.push(
      DataManager.purchases
        .filter((x) => new Date(x.time).toDateString() === d.toDateString())
        .reduce((a, b) => a + b.total, 0)
    );
    // 出货图表改为显示销售额
    outData.push(
      DataManager.outbound
        .filter((x) => new Date(x.time).toDateString() === d.toDateString())
        .reduce((a, b) => a + (b.totalSales || b.totalValue || 0), 0)
    );
  }
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "出货 (销售额)", data: outData, backgroundColor: "#fa8c16" },
        { label: "进货 (成本)", data: inData, backgroundColor: "#1677ff" },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}
function loadReports() {
  renderTrendChart("week");
  const now = new Date();
  // 优先使用 totalSales (销售额)，如果没有则回退到 cost value (旧数据)
  const todayOut = DataManager.outbound
    .filter((x) => new Date(x.time).toDateString() === now.toDateString())
    .reduce(
      (a, b) =>
        a + (b.totalSales !== undefined ? b.totalSales : b.totalValue || 0),
      0
    );
  const todayIn = DataManager.purchases
    .filter((x) => new Date(x.time).toDateString() === now.toDateString())
    .reduce((a, b) => a + b.total, 0);
  const stockVal = DataManager.products.reduce(
    (a, p) => a + p.stock * p.costPrice,
    0
  );
  document.getElementById("todayOut").innerText =
    Utils.formatCurrency(todayOut);
  document.getElementById("todayIn").innerText = Utils.formatCurrency(todayIn);
  document.getElementById("stockValue").innerText =
    Utils.formatCurrency(stockVal);
}

// 侧边栏与导航
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  if (sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  } else {
    sidebar.classList.add("open");
    overlay.classList.add("open");
  }
}

function switchTab(id) {
  document
    .querySelectorAll(".view-section, .nav-item")
    .forEach((e) => e.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  const navBtn = document.querySelector(
    `.nav-item[onclick="switchTab('${id}')"]`
  );
  if (navBtn) navBtn.classList.add("active");

  // 更新标题
  const titles = {
    reports: "仪表盘",
    outbound: "出货管理",
    purchase: "进货入库",
    storeroom: "仓库看板",
    inventory: "总库存表",
    products: "商品档案",
  };
  if (document.getElementById("pageTitle")) {
    document.getElementById("pageTitle").innerText = titles[id] || "Erawan WMS";
  }

  refreshAllViews();

  // 移动端点击后自动收起
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    if (sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    }
  }
}

function refreshAllViews() {
  loadProducts();
  loadPurchases();
  loadOutboundHistory();
  loadStoreroomDashboard();
  loadReports();
  loadInventory();
  updateProductList();
}

function loadInventory() {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = DataManager.products
    .map((p) => {
      let loc = "";
      for (let i = 1; i <= 5; i++)
        if (p.storerooms[i] > 0)
          loc += ` <span class="badge" style="color:#666;background:#eee">${DataManager.storeroomNames[
            i
          ].substring(0, 3)}:${p.storerooms[i]}</span>`;
      return `<tr><td><b>${p.name}</b></td><td>${
        p.category
      }</td><td>${Utils.formatStockDisplay(p.stock, p)}</td><td>${
        loc || "-"
      }</td><td>${Utils.formatCurrency(p.costPrice)}</td><td>${
        p.stock < 10
          ? '<span class="badge danger">紧张</span>'
          : '<span class="badge success">充足</span>'
      }</td></tr>`;
    })
    .join("");
}

function updateProductList() {
  const fillStore = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const val = el.value;
      el.innerHTML = Object.entries(DataManager.storeroomNames)
        .map(([k, v]) => `<option value="${k}">${v}</option>`)
        .join("");
      el.value = val || 1;
    }
  };
  fillStore("outboundStoreroom");
  fillStore("purchaseStoreroom");
  fillStore("manageStoreroomId");
  const storeId = document.getElementById("outboundStoreroom")?.value || 1;

  // 出货搜索
  Utils.setupSearchableInput(
    "outboundSearchWrapper",
    DataManager.products,
    (p) => onOutboundProductChange(p),
    parseInt(storeId)
  );

  // 进货搜索 (修复点：这里绑定了新的回调函数)
  Utils.setupSearchableInput(
    "purchaseSearchWrapper",
    DataManager.products,
    (p) => onPurchaseProductSelect(p)
  );

  // 手动调整搜索
  Utils.setupSearchableInput(
    "manageSearchWrapper",
    DataManager.products,
    (p) => showCurrentStock(p.name),
    parseInt(document.getElementById("manageStoreroomId")?.value || 1)
  );
}

function searchTable(tid, query) {
  const trs = document.getElementById(tid).getElementsByTagName("tr");
  Array.from(trs).forEach(
    (tr) =>
      (tr.style.display = tr.textContent
        .toLowerCase()
        .includes(query.toLowerCase())
        ? ""
        : "none")
  );
}

function showOutboundReceipt(id, items, time, remark) {
  document.getElementById(
    "billContent"
  ).innerHTML = `<div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:10px"><h3>出货单</h3><p>#${String(
    id
  ).slice(-6)} / ${Utils.formatDate(time)}</p></div>${items
    .map(
      (i) =>
        `<div style="display:flex;justify-content:space-between;margin:5px 0"><span>${i.productName}</span><span>${i.inputQty} ${i.unitName}</span></div>`
    )
    .join(
      ""
    )}<div style="border-top:1px dashed #000;margin-top:10px;padding-top:5px"><p>备注: ${
    remark || "无"
  }</p></div>`;
  document.getElementById("billModal").style.display = "block";
}
function closeBillModal() {
  document.getElementById("billModal").style.display = "none";
}

function showCurrentStock(name) {
  const store = document.getElementById("manageStoreroomId").value;
  const p = DataManager.products.find((x) => x.name === name);
  document.getElementById("currentStockDisplay").innerHTML = p
    ? `当前库存: ${Utils.formatStockDisplay(p.storerooms[store], p)}`
    : "";
}

// 清零功能
function clearCurrentStock() {
  const storeId = parseInt(document.getElementById("manageStoreroomId").value);
  const hiddenInput = document.querySelector(
    "#manageSearchWrapper input[type='hidden']"
  );

  if (!hiddenInput || !hiddenInput.value) {
    return Utils.showToast("请先选择商品", "error");
  }

  const pid = parseInt(hiddenInput.value);
  const p = DataManager.products.find((x) => x.id === pid);

  if (!p) return;

  const currentQty = p.storerooms[storeId] || 0;
  const storeName = DataManager.storeroomNames[storeId];

  if (
    confirm(
      `确定要将 【${storeName}】 的 【${p.name}】 库存清零吗？\n当前数量: ${currentQty}`
    )
  ) {
    // 逻辑：删除该仓库下的所有批次记录，或者添加一个负数批次抵消。
    // 为了数据纯净，这里选择保留历史记录，添加修正批次
    if (currentQty !== 0) {
      p.batches.push({
        storeId: storeId,
        qty: -currentQty,
        cost: p.costPrice, // Cost doesn't matter for zeroing out, keeps balance
        date: new Date().toISOString(),
        remark: "库存清零(重置)",
      });
      Utils.updateTotalStock(p);
      DataManager.saveAll();
      refreshAllViews();
      // 清空输入框
      document.querySelector("#manageSearchWrapper input[type='text']").value =
        "";
      hiddenInput.value = "";
      document.getElementById("currentStockDisplay").innerHTML = "";
      Utils.showToast("库存已重置为 0");
    } else {
      Utils.showToast("当前库存已经是 0", "warning");
    }
  }
}

function manualUpdateStock(e) {
  e.preventDefault();
  const store = parseInt(document.getElementById("manageStoreroomId").value);
  const pid = document.querySelector(
    "#manageSearchWrapper input[type='hidden']"
  ).value;
  const qty = parseInt(document.getElementById("manageQuantity").value);
  const p = DataManager.products.find((x) => x.id == pid);
  if (!p || qty === 0) return;
  if (qty > 0) {
    p.batches.push({
      storeId: store,
      qty,
      cost: p.costPrice,
      date: new Date().toISOString(),
      remark: "手动增加",
    });
    Utils.updateTotalStock(p);
  } else {
    if ((p.storerooms[store] || 0) < Math.abs(qty))
      return Utils.showToast("库存不足", "error");
    deductStock(p, store, Math.abs(qty));
  }
  DataManager.saveAll();
  document.getElementById("manageQuantity").value = "";
  document.querySelector("#manageSearchWrapper input[type='text']").value = "";
  document.getElementById("currentStockDisplay").innerHTML = "";
  refreshAllViews();
  Utils.showToast("库存已更新");
}

function exportData() {
  const data = JSON.stringify({
    products: DataManager.products,
    purchases: DataManager.purchases,
    outbound: DataManager.outbound,
    categories: DataManager.categories,
    names: DataManager.storeroomNames,
    cnt: DataManager.productIdCounter,
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.download = `Erawan_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}
function importData(input) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const d = JSON.parse(e.target.result);
      if (confirm("确定覆盖当前数据？")) {
        localStorage.setItem("products", JSON.stringify(d.products));
        localStorage.setItem("purchases", JSON.stringify(d.purchases));
        localStorage.setItem("outbound", JSON.stringify(d.outbound || []));
        localStorage.setItem("categories", JSON.stringify(d.categories));
        if (d.names)
          localStorage.setItem("storeroomNames", JSON.stringify(d.names));
        if (d.cnt) localStorage.setItem("productIdCounter", d.cnt);
        DataManager.refresh();
        location.reload();
      }
    } catch (err) {
      alert("文件错误");
    }
  };
  if (input.files[0]) reader.readAsText(input.files[0]);
}

window.onload = function () {
  document.getElementById("currentDate").innerText =
    new Date().toLocaleDateString();
  setPurchaseDateToNow();
  refreshAllViews();
  switchTab("reports");
};
