// ============================================
// SwiftShip Delivery — Frontend Application
// ============================================

var APP_CONFIG = {
  companyName: "SwiftShip Delivery",
  currency: "USD",
  supportEmail: "support@swiftship.com",
  supportPhone: "+1 (646) 734-0058",
  whatsappNumber: "16467340058",
  pricing: {
    "Standard":      { base: 5,  perKg: 1.5, perZone: 3, multiplier: 1.0 },
    "Express":       { base: 10, perKg: 2.5, perZone: 5, multiplier: 1.6 },
    "Same Day":      { base: 20, perKg: 4,   perZone: 8, multiplier: 2.5 },
    "International": { base: 35, perKg: 8,   perZone: 15, multiplier: 3.2 }
  },
  extras: { insurance: 0.10, fragile: 5, signature: 3 }

};
function sendBookingEmail(delivery) {
  fetch("/api/send-booking-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(delivery)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.ok) console.log("Booking email sent OK");
    else console.error("Email failed:", data.message || data.error);
  })
  .catch(function(err) {
    console.error("Email request failed:", err);
  });
} 
var DEMO_TRACKING = {
  "SWIFT-DEMO-001": {
    tracking_number: "SWIFT-DEMO-001",
    customer_name: "Demo Customer",
    pickup_address: "12 Broad Street, New York",
    delivery_address: "45 Marina Road, London",
    package_type: "Parcel",
    status: "OUT FOR DELIVERY",
    created_at: "2026-09-14T09:30:00",
    delivery_date: "2026-09-16",
    estimated_cost: 27.50,
    isDemo: true,
    history: [
      { new_status: "PENDING",   note: "Order created",           created_at: "2026-09-14T09:30:00" },
      { new_status: "CONFIRMED", note: "Pickup confirmed",        created_at: "2026-09-14T11:15:00" },
      { new_status: "PICKED UP", note: "Package collected",       created_at: "2026-09-15T08:00:00" },
      { new_status: "IN TRANSIT",note: "In transit to destination", created_at: "2026-09-15T14:20:00" },
      { new_status: "OUT FOR DELIVERY", note: "On the delivery vehicle", created_at: "2026-09-16T07:45:00" }
    ]
  }
};

var SERVICES = [
  { id: "standard",      icon: "\uD83D\uDCE6", key: "services.standard",      time: "2\u20135 days" },
  { id: "express",       icon: "\u26A1",       key: "services.express",       time: "1 day" },
  { id: "sameday",       icon: "\uD83D\uDE80", key: "services.sameday",       time: "Same day" },
  { id: "international", icon: "\uD83C\uDF0D", key: "services.intl",          time: "5\u201314 days" },
  { id: "business",      icon: "\uD83D\uDCBC", key: "services.business",      time: "Flexible" },
  { id: "bulk",          icon: "\uD83D\uDCDA", key: "services.bulk",          time: "Flexible" },
  { id: "document",      icon: "\uD83D\uDCC4", key: "services.document",      time: "1\u20132 days" },
  { id: "ecommerce",     icon: "\uD83D\uDED2", key: "services.ecommerce",     time: "2\u20134 days" }
];

var FAQS = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
  { q: "faq.q6", a: "faq.a6" },
  { q: "faq.q7", a: "faq.a7" },
  { q: "faq.q8", a: "faq.a8" },
  { q: "faq.q9", a: "faq.a9" },
  { q: "faq.q10", a: "faq.a10" }
];

var VIEWS = ["home","services","book","track","pricing","business","dashboard","admin","login","register","support","about","privacy","terms","refund"];

// ============================================
// NAVIGATION
// ============================================
function navigate(view) {
  if (VIEWS.indexOf(view) === -1) view = "home";
  var views = document.querySelectorAll(".view");
  for (var i = 0; i < views.length; i++) views[i].classList.remove("active");
  var el = document.getElementById("view-" + view);
  if (el) el.classList.add("active");
  else document.getElementById("view-home").classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  var links = document.querySelectorAll(".nav-links a");
  for (var j = 0; j < links.length; j++) {
    if (links[j].dataset.nav === view) links[j].classList.add("active");
    else links[j].classList.remove("active");
  }
  var mob = document.getElementById("mobile-menu");
  if (mob) mob.classList.remove("open");

  if (view === "dashboard") renderDashboard();
  if (view === "admin") renderAdminDashboard();
  if (view === "driver") renderDriverDashboard();
  if (view === "book") updateBookingSummary();
}

function toggleMobile() {
  document.getElementById("mobile-menu").classList.toggle("open");
}

// ============================================
// TOASTS
// ============================================
function toast(message, type, duration) {
  type = type || "info";
  duration = duration || 3500;
  var container = document.getElementById("toasts");
  if (!container) return;
  var el = document.createElement("div");
  el.className = "toast " + (type === "error" ? "error" : type === "success" ? "success" : type === "warn" ? "warn" : "");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(function() { el.remove(); }, duration);
}

// ============================================
// MODAL
// ============================================
function openModal(html) {
  var backdrop = document.getElementById("modal");
  var content = document.getElementById("modal-content");
  if (!backdrop || !content) return;
  content.innerHTML = '<button class="close" onclick="closeModal()">\u00D7</button>' + html;
  backdrop.classList.add("show");
}
function closeModal() {
  var m = document.getElementById("modal");
  if (m) m.classList.remove("show");
}

// ============================================
// PRICING
// ============================================
function estimateZone(a, b) {
  if (!a || !b) return 1;
  var x = a.toLowerCase().trim(), y = b.toLowerCase().trim();
  if (x === y) return 1;
  var sA = x.split(/[,\s]+/), sB = y.split(/[,\s]+/);
  var c = 0;
  for (var i = 0; i < sA.length; i++) if (sB.indexOf(sA[i]) !== -1) c++;
  return 1 + Math.round((1 - c / Math.max(sA.length, sB.length, 1)) * 2);
}

function calculateDeliveryPrice(opts) {
  var rule = APP_CONFIG.pricing[opts.service] || APP_CONFIG.pricing.Standard;
  var w = Math.max(0.1, Number(opts.weight) || 1);
  var q = Math.max(1, Number(opts.quantity) || 1);
  var zone = estimateZone(opts.pickup, opts.delivery);
  var cost = (rule.base + rule.perKg * w + rule.perZone * zone) * rule.multiplier * q;
  if (opts.insurance) cost *= (1 + APP_CONFIG.extras.insurance);
  if (opts.fragile) cost += APP_CONFIG.extras.fragile * q;
  if (opts.signature) cost += APP_CONFIG.extras.signature * q;
  return { cost: Math.round(cost * 100) / 100, zone: zone };
}

function quickQuote() {
  var pickup = document.getElementById("q-pickup").value.trim();
  var delivery = document.getElementById("q-delivery").value.trim();
  var weight = document.getElementById("q-weight").value;
  var service = document.getElementById("q-service").value;
  if (!pickup || !delivery) { toast("Please enter both pickup and delivery locations.", "error"); return; }
  var r = calculateDeliveryPrice({ pickup: pickup, delivery: delivery, weight: weight, service: service });
  document.getElementById("quote-amount").textContent = "$" + r.cost.toFixed(2);
  document.getElementById("quote-result").classList.add("show");
  toast("Estimate calculated!", "success");
}

function calculatePricing() {
  var pickup = document.getElementById("p-pickup").value;
  var delivery = document.getElementById("p-delivery").value;
  var weight = document.getElementById("p-weight").value;
  var service = document.getElementById("p-service").value;
  var qty = document.getElementById("p-qty").value;
  if (!pickup || !delivery) { toast("Enter both locations.", "error"); return; }
  var r = calculateDeliveryPrice({ pickup: pickup, delivery: delivery, weight: weight, service: service, quantity: qty });
  document.getElementById("pricing-result").innerHTML =
    '<div class="quote-result show" style="margin-top:0">' +
      '<div><div style="font-size:.8rem;color:#64748b">Estimated Delivery Cost</div>' +
      '<div class="amount">$' + r.cost.toFixed(2) + '</div></div>' +
      '<div style="text-align:right"><div class="note">Final price confirmed on pickup.</div>' +
      '<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="navigate(\'book\')">Book This Delivery</button></div>' +
    '</div>';
}

// ============================================
// SERVICES + FAQ
// ============================================
function renderServices() {
  var grid = document.getElementById("services-grid");
  var gridFull = document.getElementById("services-grid-full");
  var html = "";
  for (var i = 0; i < SERVICES.length; i++) {
    var s = SERVICES[i];
    var title = (typeof t === "function") ? t(s.key) : s.key;
    var desc = (typeof t === "function") ? t(s.key + ".desc") : "";
    html += '<div class="card clickable" onclick="showServiceDetails(\'' + s.id + '\')">' +
      '<div class="icon">' + s.icon + '</div>' +
      '<h3>' + title + '</h3>' +
      '<p>' + desc + '</p>' +
      '<div style="font-size:.82rem;color:#64748b;margin-top:10px">\u23F1 ' + s.time + '</div>' +
      '<span class="learn">Learn More \u2192</span>' +
    '</div>';
  }
  if (grid) grid.innerHTML = html;
  if (gridFull) gridFull.innerHTML = html;
}

function showServiceDetails(id) {
  var s = null;
  for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].id === id) s = SERVICES[i];
  if (!s) return;
  var title = (typeof t === "function") ? t(s.key) : s.key;
  var desc = (typeof t === "function") ? t(s.key + ".desc") : "";
  openModal(
    '<h3>' + s.icon + ' ' + title + '</h3>' +
    '<p style="color:#64748b;margin-bottom:14px">' + desc + '</p>' +
    '<div style="background:#f1f5f9;padding:14px;border-radius:10px;margin-bottom:14px">' +
      '<div style="font-size:.85rem;color:#64748b">Estimated delivery time</div>' +
      '<div style="font-size:1.1rem;font-weight:700">' + s.time + '</div>' +
    '</div>' +
    '<button class="btn btn-primary" style="width:100%" onclick="closeModal();navigate(\'book\')">Book a Delivery</button>'
  );
}

function renderFAQ() {
  var list = document.getElementById("faq-list");
  if (!list) return;
  var html = "";
  for (var i = 0; i < FAQS.length; i++) {
    var f = FAQS[i];
    var q = (typeof t === "function") ? t(f.q) : f.q;
    var a = (typeof t === "function") ? t(f.a) : f.a;
    html += '<div class="faq-item" data-faq="' + i + '">' +
      '<button class="faq-q" onclick="toggleFAQ(' + i + ')"><span>' + q + '</span></button>' +
      '<div class="faq-a"><p>' + a + '</p></div>' +
    '</div>';
  }
  list.innerHTML = html;
}

function toggleFAQ(i) {
  var item = document.querySelector('[data-faq="' + i + '"]');
  if (item) item.classList.toggle("open");
}

// ============================================
// BOOKING FORM
// ============================================
function gatherBooking() {
  var getVal = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
  var getCheck = function(id) { var el = document.getElementById(id); return el ? el.checked : false; };
  return {
    customer_name:  getVal("b-name"),
    customer_email: getVal("b-email"),
    customer_phone: getVal("b-phone"),
    pickup_address: getVal("b-pickup-addr") + ", " + getVal("b-pickup-city"),
    delivery_address: getVal("b-deliv-addr") + ", " + getVal("b-deliv-city"),
    package_type:   getVal("b-pkg-type"),
    package_description: getVal("b-desc"),
    package_weight: getVal("b-weight"),
    package_qty:    getVal("b-qty"),
    delivery_type:  getVal("b-service"),
    pickup_date:    getVal("b-date"),
    special_instructions: getVal("b-instructions"),
    insurance:      getCheck("b-insurance"),
    fragile:        getCheck("b-fragile"),
    signature:      getCheck("b-signature")
  };
}

function updateBookingSummary() {
  var summary = document.getElementById("booking-summary");
  if (!summary) return;
  var b = gatherBooking();
  var price = calculateDeliveryPrice({
    pickup: b.pickup_address, delivery: b.delivery_address,
    weight: b.package_weight, service: b.delivery_type,
    quantity: b.package_qty, insurance: b.insurance, fragile: b.fragile, signature: b.signature
  });
  var extras = [];
  if (b.insurance) extras.push("Insurance (+10%)");
  if (b.fragile) extras.push("Fragile (+$5)");
  if (b.signature) extras.push("Signature (+$3)");

  var extrasHtml = "";
  if (extras.length) {
    extrasHtml = '<div style="padding:12px 0;border-bottom:1px solid #e2e8f0">' +
      '<div style="font-size:.78rem;color:#64748b">Extras</div>' +
      '<div style="font-weight:600;font-size:.88rem">' + extras.join("<br>") + '</div></div>';
  }

  summary.innerHTML =
    '<div style="padding:12px 0;border-bottom:1px solid #e2e8f0">' +
      '<div style="font-size:.78rem;color:#64748b">Service</div>' +
      '<div style="font-weight:600">' + (b.delivery_type || "\u2014") + '</div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #e2e8f0">' +
      '<div style="font-size:.78rem;color:#64748b">Pickup</div>' +
      '<div style="font-weight:600;font-size:.9rem">' + (b.pickup_address || "\u2014") + '</div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #e2e8f0">' +
      '<div style="font-size:.78rem;color:#64748b">Destination</div>' +
      '<div style="font-weight:600;font-size:.9rem">' + (b.delivery_address || "\u2014") + '</div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #e2e8f0">' +
      '<div style="font-size:.78rem;color:#64748b">Package</div>' +
      '<div style="font-weight:600">' + (b.package_type || "Parcel") + ' \u2022 ' + (b.package_weight || 1) + 'kg \u2022 x' + (b.package_qty || 1) + '</div></div>' +
    extrasHtml +
    '<div style="padding:16px 0;border-top:2px solid #0b5cff;margin-top:8px;display:flex;justify-content:space-between;align-items:center">' +
      '<div><div style="font-size:.8rem;color:#64748b">Estimated Delivery Cost</div>' +
      '<div style="font-size:.72rem;color:#94a3b8">Final price confirmed on pickup</div></div>' +
      '<div style="font-size:1.6rem;font-weight:800;color:#0b5cff">$' + price.cost.toFixed(2) + '</div></div>';
}

var BOOKING_FIELDS = ["b-pkg-type","b-weight","b-qty","b-service","b-pickup-addr","b-pickup-city","b-deliv-addr","b-deliv-city","b-insurance","b-fragile","b-signature"];
function attachBookingListeners() {
  for (var i = 0; i < BOOKING_FIELDS.length; i++) {
    var el = document.getElementById(BOOKING_FIELDS[i]);
    if (el) {
      el.addEventListener("input", updateBookingSummary);
      el.addEventListener("change", updateBookingSummary);
    }
  }
}

function submitBooking() {
  var b = gatherBooking();
  if (!b.customer_name || !b.customer_email || !b.customer_phone) {
    toast("Please fill in all customer fields.", "error"); return;
  }
  if (!b.pickup_address.replace(",", "").trim()) { toast("Please fill in the pickup address.", "error"); return; }
  if (!b.delivery_address.replace(",", "").trim()) { toast("Please fill in the delivery address.", "error"); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.customer_email)) { toast("Please enter a valid email.", "error"); return; }

  var btn = document.getElementById("book-submit-btn");
  var original = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting...';

  var headers = { "Content-Type": "application/json" };
  var token = localStorage.getItem("swiftship_token");
  if (token) headers.Authorization = "Bearer " + token;

  fetch("/api/deliveries", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      customer_email: b.customer_email,
      pickup_address: b.pickup_address,
      delivery_address: b.delivery_address,
      package_description: b.package_description,
      package_weight: b.package_weight,
      package_type: b.package_type,
      pickup_date: b.pickup_date,
      delivery_date: b.pickup_date,
      special_instructions: b.special_instructions,
      delivery_type: b.delivery_type,
      estimated_cost: calculateDeliveryPrice({ pickup: b.pickup_address, delivery: b.delivery_address, weight: b.package_weight, service: b.delivery_type, quantity: b.package_qty, insurance: b.insurance, fragile: b.fragile, signature: b.signature }).cost
    })
  })
  .then(function(res) {
    return res.json().then(function(data) { return { ok: res.ok, data: data }; });
  })
  .then(function(result) {
    if (!result.ok) throw new Error(result.data.error || "Booking failed");
    saveShipmentLocally(result.data.delivery);
    sendBookingEmail(result.data.delivery);
    showBookingSuccess(result.data.delivery);
  })
  .catch(function(e) {
    toast(e.message || "Could not submit booking.", "error");
  })
  .then(function() {
    btn.disabled = false;
    btn.textContent = original;
  });
}

function showBookingSuccess(delivery) {
  var d = delivery;
  var row = function(label, value) {
    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0"><span style="color:#64748b;font-size:.82rem">' + label + '</span><strong style="font-size:.88rem;text-align:right;max-width:60%">' + value + '</strong></div>';
  };
  var receiptHtml =
    '<div style="text-align:center;margin-bottom:16px">' +
      '<div style="font-size:2.5rem;margin-bottom:4px">✅</div>' +
      '<h3 style="margin:0 0 4px;font-size:1.3rem">Booking Confirmed</h3>' +
      '<p style="color:#64748b;font-size:.85rem;margin:0">Thank you for choosing SwiftShip Delivery</p>' +
    '</div>' +
    '<div style="background:linear-gradient(135deg,#0b5cff,#0891b2);color:#fff;padding:18px;border-radius:12px;text-align:center;margin-bottom:16px">' +
      '<div style="font-size:.75rem;opacity:.9;text-transform:uppercase;letter-spacing:.05em">Tracking Number</div>' +
      '<div style="font-size:1.5rem;font-weight:800;font-family:monospace;margin-top:6px;letter-spacing:.05em">' + d.tracking_number + '</div>' +
    '</div>' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:16px;text-align:left">' +
      row("Customer", d.customer_name || "\u2014") +
      row("Phone", d.customer_phone || "\u2014") +
      row("Service", d.delivery_type || "Standard") +
      row("Pickup", d.pickup_address || "\u2014") +
      row("Destination", d.delivery_address || "\u2014") +
      row("Package", (d.package_type || "Parcel") + " \u2022 " + (d.package_weight || 1) + " kg") +
      row("Booking Date", new Date(d.created_at || Date.now()).toLocaleString()) +
    '</div>' +
    '<div style="background:#eef4ff;border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">' +
      '<span style="color:#475569;font-size:.88rem">Estimated Cost</span>' +
      '<span style="font-size:1.4rem;font-weight:800;color:#0b5cff">$' + Number(d.estimated_cost || 0).toFixed(2) + '</span>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" style="flex:1;min-width:120px" onclick="printReceipt()">🖨️ Print Receipt</button>' +
      '<button class="btn btn-outline" style="flex:1;min-width:120px" onclick="closeModal();navigate(\'track\');setTimeout(function(){document.getElementById(\'track-input\').value=\'' + d.tracking_number + '\';trackPackage();},200)">📦 Track Package</button>' +
    '</div>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px" onclick="closeModal();navigate(\'book\')">+ Book Another Delivery</button>';
  openModal(receiptHtml);
  window.__lastReceipt = receiptHtml;
  toast("Delivery booked: " + d.tracking_number, "success", 6000);
}
function printReceipt() {
  window.print();
}
// TRACKING
// ============================================
var wizardStep = 1;
function wizardShow(step) {
  wizardStep = step;
  for (var i = 1; i <= 6; i++) {
    var el = document.getElementById("wiz-step-" + i);
    if (el) el.style.display = (i === step) ? "block" : "none";
  }
  var b = document.getElementById("wiz-back-btn");
  var n = document.getElementById("wiz-next-btn");
  if (b) b.style.display = (step > 1) ? "inline-flex" : "none";
  if (n) n.style.display = (step < 6) ? "inline-flex" : "none";
  if (step === 6) wizardBuildReview();
  var sub = document.getElementById("wiz-submit-btn");
  if (sub) sub.style.display = (step === 6) ? "inline-flex" : "none";
}
function wizardNext() {
  var g = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
  if (wizardStep === 1 && (!g("wiz-name") || !g("wiz-email") || !g("wiz-phone"))) { alert("Please fill in name, email, phone."); return; }
  if (wizardStep === 2 && (!g("wiz-pickup-addr") || !g("wiz-pickup-city"))) { alert("Please fill in pickup address."); return; }
  if (wizardStep === 3 && (!g("wiz-deliv-addr") || !g("wiz-deliv-city"))) { alert("Please fill in delivery address."); return; }
  if (wizardStep < 6) wizardShow(wizardStep + 1);
}
function wizardBack() {
  if (wizardStep > 1) wizardShow(wizardStep - 1);
}
function wizardSubmit() {
  var g = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
  var body = {
    customer_name: g("wiz-name"),
    customer_email: g("wiz-email"),
    customer_phone: g("wiz-phone"),
    pickup_address: g("wiz-pickup-addr") + ", " + g("wiz-pickup-city"),
    delivery_address: g("wiz-deliv-addr") + ", " + g("wiz-deliv-city"),
    package_type: g("wiz-pkg-type"),
    package_description: g("wiz-desc"),
    package_weight: g("wiz-weight"),
    delivery_type: g("wiz-service"),
    pickup_date: g("wiz-date"),
    special_instructions: g("wiz-instructions")
  };
  var btn = document.getElementById("wiz-submit-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }
  fetch("/api/deliveries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
  .then(function(result) {
    if (!result.ok) throw new Error(result.data.error || "Booking failed");
    saveShipmentLocally(result.data.delivery);
    sendBookingEmail(result.data.delivery);
    showBookingSuccess(result.data.delivery);
    wizardShow(1);
  })
  .catch(function(e) { alert(e.message || "Could not submit booking."); })
  .then(function() { if (btn) { btn.disabled = false; btn.textContent = "✓ Submit Booking"; } });
}
function wizardBuildReview() {
  var box = document.getElementById("wiz-review");
  if (!box) return;
  var g = function(id) { var el = document.getElementById(id); return el ? el.value : ""; };
  box.innerHTML =
    '<strong>Customer:</strong> ' + g("wiz-name") + '<br>' +
    '<strong>Email:</strong> ' + g("wiz-email") + '<br>' +
    '<strong>Phone:</strong> ' + g("wiz-phone") + '<br>' +
    '<strong>Pickup:</strong> ' + g("wiz-pickup-addr") + ', ' + g("wiz-pickup-city") + '<br>' +
    '<strong>Delivery:</strong> ' + g("wiz-deliv-addr") + ', ' + g("wiz-deliv-city") + '<br>' +
    '<strong>Package:</strong> ' + g("wiz-pkg-type") + ' • ' + g("wiz-weight") + ' kg<br>' +
    '<strong>Service:</strong> ' + g("wiz-service") + '<br>' +
    '<strong>Pickup Date:</strong> ' + (g("wiz-date") || "ASAP");
}

function wizardSubmit() {
  var g = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
  var body = {
    customer_name: g("wiz-name"),
    customer_email: g("wiz-email"),
    customer_phone: g("wiz-phone"),
    pickup_address: g("wiz-pickup-addr") + ", " + g("wiz-pickup-city"),
    delivery_address: g("wiz-deliv-addr") + ", " + g("wiz-deliv-city"),
    package_type: g("wiz-pkg-type"),
    package_description: g("wiz-desc"),
    package_weight: g("wiz-weight"),
    delivery_type: g("wiz-service"),
    pickup_date: g("wiz-date"),
    special_instructions: g("wiz-instructions")
  };
  var btn = document.getElementById("wiz-submit-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }
  fetch("/api/deliveries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
  .then(function(result) {
    if (!result.ok) throw new Error(result.data.error || "Booking failed");
    saveShipmentLocally(result.data.delivery);
    sendBookingEmail(result.data.delivery);
    showBookingSuccess(result.data.delivery);
    wizardShow(1);
  })
  .catch(function(e) { alert(e.message || "Could not submit booking."); })
  .then(function() { if (btn) { btn.disabled = false; btn.textContent = "✓ Submit Booking"; } });
}
  var quickDiv = document.getElementById("booking-quick");
  var wizardDiv = document.getElementById("booking-wizard");
  var quickBtn = document.getElementById("mode-quick-btn");
function setBookingMode(mode) {
  var q = document.getElementById("booking-quick");
  var w = document.getElementById("booking-wizard");
  var qb = document.getElementById("mode-quick-btn");
  var wb = document.getElementById("mode-wizard-btn");
  if (!q || !w) return;
  var isWiz = (mode === "wizard");
  q.style.display = isWiz ? "none" : "grid";
  w.style.display = isWiz ? "block" : "none";
  if (qb) { qb.className = isWiz ? "btn btn-outline" : "btn btn-primary"; }
  if (wb) { wb.className = isWiz ? "btn btn-primary" : "btn btn-outline"; }
}
  function heroTrack() {
  var input = document.getElementById("hero-track-input");
  if (!input) return;
  var tn = input.value.trim().toUpperCase();
  if (!tn) {
    alert("Please enter a tracking number.");
    return;
  }
  if (typeof navigate === "function") navigate("track");
  setTimeout(function() {
    var trackInput = document.getElementById("track-input");
    if (trackInput) {
      trackInput.value = tn;
      if (typeof trackPackage === "function") trackPackage();
    }
  }, 150);
}
function trackPackage() {
  var input = document.getElementById("track-input");
  var box = document.getElementById("track-result");
  var tn = (input.value || "").trim().toUpperCase();
  if (!tn) { toast("Please enter a tracking number.", "error"); return; }

  box.innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner"></span></div>';

  fetch("/api/deliveries/" + encodeURIComponent(tn))
    .then(function(res) {
      if (res.ok) return res.json();
      return null;
    })
    .catch(function() { return null; })
    .then(function(data) {
      var delivery = null, history = [];
      if (data && data.delivery) { delivery = data.delivery; history = data.history || []; }
      else if (DEMO_TRACKING[tn]) { delivery = DEMO_TRACKING[tn]; history = delivery.history; }

      if (!delivery) {
        box.innerHTML = '<div class="notice" style="border-color:#dc2626;background:#fef2f2;color:#991b1b;margin-top:20px">' +
          '<strong>Tracking number not found.</strong><br>Please check the number and try again.<br><br>' +
          '<button class="btn btn-outline btn-sm" onclick="navigate(\'support\')">Contact Support</button></div>';
        return;
      }
      renderTracking(delivery, history, box);
    });
}

function renderTracking(d, history, box) {
  var statuses = ["PENDING","CONFIRMED","PICKED UP","IN TRANSIT","OUT FOR DELIVERY","DELIVERED"];
  var currentIdx = statuses.indexOf(d.status);
  var friendly = {
    "PENDING":"Order Created","CONFIRMED":"Pickup Confirmed","PICKED UP":"Package Collected",
    "IN TRANSIT":"In Transit","OUT FOR DELIVERY":"Out for Delivery","DELIVERED":"Delivered","CANCELLED":"Cancelled"
  };

  var timeline = "";
  for (var i = 0; i < statuses.length; i++) {
    var s = statuses[i];
    var done = i < currentIdx;
    var current = i === currentIdx;
    var cls = done ? "done" : (current ? "current" : "");
    var dot = done ? "\u2713" : (current ? "\u25CF" : (i + 1));
    var hist = null;
    for (var j = 0; j < history.length; j++) if (history[j].new_status === s) hist = history[j];
    var subtext = hist ? new Date(hist.created_at).toLocaleString() + (hist.note ? " \u2014 " + hist.note : "") : "Pending";
    timeline += '<div class="tl-item">' +
      '<div class="tl-dot ' + cls + '">' + dot + '</div>' +
      '<div class="tl-content"><strong>' + (friendly[s] || s) + '</strong>' +
      '<span>' + subtext + '</span></div></div>';
  }

  var demoBadge = d.isDemo ? '<span class="badge demo" style="margin-bottom:12px;display:inline-block">DEMO DATA</span>' : '';

  box.innerHTML =
    '<div style="margin-top:28px;background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:24px">' +
      demoBadge +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:22px">' +
        '<div><div style="font-size:.78rem;color:#64748b">Tracking Number</div><strong>' + d.tracking_number + '</strong></div>' +
        '<div><div style="font-size:.78rem;color:#64748b">Current Status</div><span class="badge transit">' + (friendly[d.status] || d.status) + '</span></div>' +
        '<div><div style="font-size:.78rem;color:#64748b">From</div><strong style="font-size:.9rem">' + d.pickup_address + '</strong></div>' +
        '<div><div style="font-size:.78rem;color:#64748b">To</div><strong style="font-size:.9rem">' + d.delivery_address + '</strong></div>' +
      '</div>' +
      '<h3 style="margin-bottom:16px;font-size:1.05rem">Tracking Timeline</h3>' +
      '<div class="timeline">' + timeline + '</div>' +
    '</div>';
}

// ============================================
// AUTH
// ============================================
function doLogin() {
  var email = document.getElementById("login-email").value.trim();
  var password = document.getElementById("login-password").value;
  if (!email || !password) { toast("Please fill in all fields.", "error"); return; }

  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: password })
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
  .then(function(result) {
    if (!result.ok) throw new Error(result.data.error || "Login failed");
    localStorage.setItem("swiftship_token", result.data.token);
    localStorage.setItem("swiftship_user", JSON.stringify(result.data.user));
    toast("Welcome back, " + result.data.user.name, "success");if (result.data.user.role === "admin") navigate("admin");
else if (result.data.user.role === "driver") navigate("driver");
else navigate("dashboard");
  })
  .catch(function(err) { toast(err.message || "Login failed.", "error"); });
}

function doRegister() {
  var name = document.getElementById("reg-name").value.trim();
  var email = document.getElementById("reg-email").value.trim();
  var phone = document.getElementById("reg-phone").value.trim();
  var password = document.getElementById("reg-password").value;
  var confirm = document.getElementById("reg-confirm").value;
  if (!name || !email || !password) { toast("Please fill in all required fields.", "error"); return; }
  if (password.length < 6) { toast("Password must be at least 6 characters.", "error"); return; }
  if (password !== confirm) { toast("Passwords don't match.", "error"); return; }

  fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name, email: email, phone: phone, password: password })
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
  .then(function(result) {
    if (!result.ok) throw new Error(result.data.error || "Registration failed");
    localStorage.setItem("swiftship_token", result.data.token);
    localStorage.setItem("swiftship_user", JSON.stringify(result.data.user));
    toast("Account created!", "success");
    navigate("dashboard");
  })
  .catch(function(err) { toast(err.message || "Registration failed.", "error"); });
}

function doLogout() {
  localStorage.removeItem("swiftship_token");
  localStorage.removeItem("swiftship_user");
  toast("Logged out.", "success");
  navigate("home");
}

// ============================================
// DASHBOARD
// ============================================
function saveShipmentLocally(delivery) {
  var list = JSON.parse(localStorage.getItem("swiftship_shipments") || "[]");
  list.unshift({
    tracking_number: delivery.tracking_number,
    destination: delivery.delivery_address,
    service: delivery.delivery_type,
    status: delivery.status,
    price: delivery.estimated_cost,
    date: delivery.created_at
  });
  localStorage.setItem("swiftship_shipments", JSON.stringify(list.slice(0, 50)));
}

function renderDashboard() {
  var user = null;
  try { user = JSON.parse(localStorage.getItem("swiftship_user") || "null"); } catch(e) {}
  var token = localStorage.getItem("swiftship_token");

  var welcome = document.getElementById("dash-welcome");
  if (welcome) welcome.textContent = user ? "Hello, " + user.name : "Sign in to see your deliveries.";

  var shipments = JSON.parse(localStorage.getItem("swiftship_shipments") || "[]");

  var renderStatsAndTable = function() {
    var active = 0, delivered = 0, pending = 0;
    for (var i = 0; i < shipments.length; i++) {
      var s = shipments[i];
      if (["DELIVERED","CANCELLED"].indexOf(s.status) === -1) active++;
      if (s.status === "DELIVERED") delivered++;
      if (s.status === "PENDING") pending++;
    }
    var statsEl = document.getElementById("dash-stats");
    if (statsEl) {
      statsEl.innerHTML =
        '<div class="stat-card"><div class="label">Active Deliveries</div><div class="value">' + active + '</div></div>' +
        '<div class="stat-card"><div class="label">Delivered</div><div class="value">' + delivered + '</div></div>' +
        '<div class="stat-card"><div class="label">Pending Pickups</div><div class="value">' + pending + '</div></div>' +
        '<div class="stat-card"><div class="label">Total Shipments</div><div class="value">' + shipments.length + '</div></div>';
    }

    var table = document.getElementById("dash-table");
    if (!table) return;
    if (!shipments.length) {
      table.innerHTML = '<tbody><tr><td colspan="6" style="text-align:center;padding:40px;color:#64748b">No shipments yet.<br><br>' +
        '<button class="btn btn-primary btn-sm" onclick="navigate(\'book\')">Book Now</button></td></tr></tbody>';
      return;
    }

    var rows = "";
    for (var i = 0; i < shipments.length; i++) {
      var s = shipments[i];
      var badgeClass = s.status === "DELIVERED" ? "delivered" : (s.status === "PENDING" ? "pending" : "transit");
      rows += '<tr>' +
        '<td><strong>' + s.tracking_number + '</strong></td>' +
        '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (s.destination || "\u2014") + '</td>' +
        '<td>' + (s.service || "Standard") + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + s.status + '</span></td>' +
        '<td>$' + (s.price || 0).toFixed(2) + '</td>' +
        '<td><button class="btn btn-ghost btn-sm" onclick="navigate(\'track\');setTimeout(function(){document.getElementById(\'track-input\').value=\'' + s.tracking_number + '\';trackPackage();},200)">Track</button></td>' +
      '</tr>';
    }
    table.innerHTML = '<thead><tr>' +
      '<th>Tracking</th><th>Destination</th><th>Service</th><th>Status</th><th>Price</th><th>Action</th>' +
      '</tr></thead><tbody>' + rows + '</tbody>';
  };

  if (token) {
    fetch("/api/deliveries", { headers: { Authorization: "Bearer " + token } })
      .then(function(res) { return res.ok ? res.json() : null; })
      .catch(function() { return null; })
      .then(function(data) {
        if (data && data.deliveries && data.deliveries.length) {
          var mapped = [];
          for (var i = 0; i < data.deliveries.length; i++) {
            var d = data.deliveries[i];
            mapped.push({
              tracking_number: d.tracking_number,
              destination: d.delivery_address,
              service: d.delivery_type,
              status: d.status,
              price: d.estimated_cost,
              date: d.created_at
            });
          }
          shipments = mapped;
        }
        renderStatsAndTable();
      });
  } else {
    renderStatsAndTable();
  }
}

// ============================================
// FORMS
// ============================================
function renderAdminDashboard() {
  var token = localStorage.getItem("swiftship_token");
  if (!token) { alert("Please log in as admin first."); return; }
  fetch("/api/deliveries", { headers: { Authorization: "Bearer " + token } })
    .then(function(r) { return r.ok ? r.json() : null; })
    .catch(function() { return null; })
    .then(function(data) {
      if (!data || !data.deliveries) { alert("Could not load. Log in as admin."); return; }
      var list = data.deliveries;
      var pending = 0, transit = 0, delivered = 0;
      for (var i = 0; i < list.length; i++) {
        if (list[i].status === "PENDING") pending++;
        if (list[i].status === "IN TRANSIT" || list[i].status === "OUT FOR DELIVERY") transit++;
        if (list[i].status === "DELIVERED") delivered++;
      }
      var statsEl = document.getElementById("admin-stats");
      if (statsEl) {
        statsEl.innerHTML =
          '<div class="stat-card"><div class="label">Total</div><div class="value">' + list.length + '</div></div>' +
          '<div class="stat-card"><div class="label">Pending</div><div class="value">' + pending + '</div></div>' +
          '<div class="stat-card"><div class="label">In Transit</div><div class="value">' + transit + '</div></div>' +
          '<div class="stat-card"><div class="label">Delivered</div><div class="value">' + delivered + '</div></div>';
      }
      var table = document.getElementById("admin-table");
      if (!table) return;
      if (list.length === 0) {
        table.innerHTML = '<tbody><tr><td colspan="7" style="text-align:center;padding:40px">No deliveries yet.</td></tr></tbody>';
        return;
      }
      var rows = "";
      for (var j = 0; j < list.length; j++) {
        var d = list[j];
        var badge = d.status === "DELIVERED" ? "delivered" : (d.status === "PENDING" ? "pending" : "transit");
        rows += '<tr>' +
          '<td><strong>' + d.tracking_number + '</strong></td>' +
          '<td>' + (d.customer_name || "") + '</td>' +
          '<td>' + (d.delivery_address || "") + '</td>' +
          '<td>' + (d.delivery_type || "Standard") + '</td>' +
          '<td><span class="badge ' + badge + '">' + d.status + '</span></td>' +
          '<td>$' + (d.estimated_cost || 0).toFixed(2) + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" onclick="changeStatus(' + d.id + ', \'' + d.status + '\')">Change</button></td>' +
        '</tr>';
      }
      table.innerHTML = '<thead><tr><th>Tracking</th><th>Customer</th><th>Destination</th><th>Service</th><th>Status</th><th>Price</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody>';
    });
}
  
function submitBusiness() {
  var name = document.getElementById("biz-name").value.trim();
  var contact = document.getElementById("biz-contact").value.trim();
  var email = document.getElementById("biz-email").value.trim();
  if (!name || !contact || !email) { toast("Please fill in all required fields.", "error"); return; }
  toast("Inquiry submitted! We'll be in touch.", "success");
  document.getElementById("biz-name").value = "";
  document.getElementById("biz-contact").value = "";
  document.getElementById("biz-email").value = "";
  document.getElementById("biz-phone").value = "";
  document.getElementById("biz-message").value = "";
}

function submitSupport() {
  var name = document.getElementById("sup-name").value.trim();
  var email = document.getElementById("sup-email").value.trim();
  var message = document.getElementById("sup-message").value.trim();
  if (!name || !email || !message) { toast("Please fill in all fields.", "error"); return; }

  fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name, email: email,
      subject: document.getElementById("sup-subject").value,
      message: message
    })
  })
  .then(function(r) {
    if (r.ok) {
      toast("Message sent! We'll respond soon.", "success");
      document.getElementById("sup-name").value = "";
      document.getElementById("sup-email").value = "";
      document.getElementById("sup-subject").value = "";
      document.getElementById("sup-message").value = "";
    } else throw new Error("Failed");
  })
  .catch(function() { toast("Could not send message. Please try again.", "error"); });
}

function openWhatsApp() {
  window.open("https://wa.me/" + APP_CONFIG.whatsappNumber + "?text=" + encodeURIComponent("Hello SwiftShip Delivery"), "_blank");
}

// ============================================
// INIT
// ============================================
function initApp() {
  renderServices();
  renderFAQ();
  updateBookingSummary();
  attachBookingListeners();
  updateNavLinks();

  var links = document.querySelectorAll("[data-nav]");
  for (var i = 0; i < links.length; i++) {
    (function(el) {
      el.addEventListener("click", function() { navigate(el.dataset.nav); });
    })(links[i]);
  }

  var backdrop = document.getElementById("modal");
  if (backdrop) backdrop.addEventListener("click", function(e) { if (e.target.id === "modal") closeModal(); });

  window.addEventListener("swiftship:languageChanged", function() {
    renderServices();
    renderFAQ();
    updateBookingSummary();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
function showAddDriverForm() {
  var c = document.getElementById("driver-form-container");
  if (c) c.style.display = "block";
}
function hideAddDriverForm() {
  var c = document.getElementById("driver-form-container");
  if (c) c.style.display = "none";
  var r = document.getElementById("driver-form-result");
  if (r) r.innerHTML = "";
}
function saveDriver() {
  var name = (document.getElementById("drv-name") || {}).value || "";
  var email = (document.getElementById("drv-email") || {}).value || "";
  var phone = (document.getElementById("drv-phone") || {}).value || "";
  var vehicle = (document.getElementById("drv-vehicle") || {}).value || "";
  var reg = (document.getElementById("drv-reg") || {}).value || "";
  if (!name.trim() || !email.trim()) { alert("Name and email required."); return; }
  var token = localStorage.getItem("swiftship_token");
  fetch("/api/drivers", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ name: name, email: email, phone: phone, vehicle_type: vehicle, vehicle_reg: reg })
  }).then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(result) {
      if (!result.ok) throw new Error(result.data.error || "Failed");
      var resultEl = document.getElementById("driver-form-result");
      if (resultEl) {
        resultEl.innerHTML = '<div style="background:#dcfce7;border-left:4px solid #16a34a;padding:12px;border-radius:8px;font-size:.9rem"><strong>Driver created!</strong><br>Login email: <strong>' + email + '</strong><br>Temporary password: <strong>' + result.data.temporary_password + '</strong><br><span style="font-size:.8rem;color:#64748b">Save this — share with the driver.</span></div>';
      }
      document.getElementById("drv-name").value = "";
      document.getElementById("drv-email").value = "";
      document.getElementById("drv-phone").value = "";
      document.getElementById("drv-vehicle").value = "";
      document.getElementById("drv-reg").value = "";
      loadDrivers();
    })
    .catch(function(e) { alert(e.message || "Could not save."); });
}
function loadDrivers() {
  var token = localStorage.getItem("swiftship_token");
  if (!token) return;
  fetch("/api/drivers", { headers: { Authorization: "Bearer " + token } })
    .then(function(r) { return r.ok ? r.json() : null; })
    .catch(function() { return null; })
    .then(function(data) {
      var table = document.getElementById("drivers-table");
      if (!table) return;
      if (!data || !data.drivers || data.drivers.length === 0) {
        table.innerHTML = '<tbody><tr><td colspan="6" style="text-align:center;padding:30px;color:#64748b">No drivers yet.</td></tr></tbody>';
        return;
      }
      var rows = "";
      for (var i = 0; i < data.drivers.length; i++) {
        var d = data.drivers[i];
        var badge = d.active ? '<span class="badge delivered">Active</span>' : '<span class="badge cancelled">Inactive</span>';
        rows += '<tr>' +
          '<td><strong>' + d.name + '</strong></td>' +
          '<td>' + (d.email || "") + '</td>' +
          '<td>' + (d.phone || "") + '</td>' +
          '<td>' + (d.vehicle_type || "—") + ' ' + (d.vehicle_reg ? '(' + d.vehicle_reg + ')' : '') + '</td>' +
          '<td>' + badge + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" onclick="toggleDriver(' + d.id + ', ' + (d.active ? 0 : 1) + ')">' + (d.active ? 'Deactivate' : 'Activate') + '</button></td>' +
        '</tr>';
      }
      table.innerHTML = '<thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Vehicle</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody>';
    });
}
function toggleDriver(id, activate) {
  var token = localStorage.getItem("swiftship_token");
  fetch("/api/drivers/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ active: activate })
  }).then(function(r) { if (r.ok) loadDrivers(); });
}
function changeStatus(id, current) {
  var opts = ["PENDING","CONFIRMED","PICKED UP","IN TRANSIT","OUT FOR DELIVERY","DELIVERED","CANCELLED"];
  var next = prompt("Current: " + current + "\nNew status:\n" + opts.join(", "));
  if (!next) return;
  next = next.toUpperCase().trim();
  if (opts.indexOf(next) === -1) { alert("Invalid status."); return; }
  var token = localStorage.getItem("swiftship_token");
  fetch("/api/deliveries/" + id + "/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ status: next, note: "Updated by admin" })
  }).then(function(r) {
    if (r.ok) { alert("Updated to " + next); renderAdminDashboard(); }
    else { r.json().then(function(e) { alert("Failed: " + (e.error || "unknown")); }); }
  }).catch(function() { alert("Network error."); });
}
window.changeStatus = changeStatus;
function updateNavLinks() {
  var user = null;
  try { user = JSON.parse(localStorage.getItem("swiftship_user") || "null"); } catch (e) {}
  var adminLink = document.getElementById("nav-admin");
  var driverLink = document.getElementById("nav-driver");
  if (adminLink) adminLink.style.display = (user && user.role === "admin") ? "" : "none";
  if (driverLink) driverLink.style.display = (user && user.role === "driver") ? "" : "none";
}
window.updateNavLinks = updateNavLinks;
function renderDriverDashboard() {
  var user = null;
  try { user = JSON.parse(localStorage.getItem("swiftship_user") || "null"); } catch (e) {}
  var welcome = document.getElementById("driver-welcome");
  if (welcome) welcome.textContent = user ? "Welcome, " + user.name : "Please log in.";
  var token = localStorage.getItem("swiftship_token");
  if (!token) { alert("Please log in as a driver."); return; }
  fetch("/api/driver/me/deliveries", { headers: { Authorization: "Bearer " + token } })
    .then(function(r) { return r.ok ? r.json() : null; })
    .catch(function() { return null; })
    .then(function(data) {
      var list = (data && data.deliveries) || [];
      var total = list.length;
      var pending = 0, transit = 0, delivered = 0;
      for (var i = 0; i < list.length; i++) {
        if (list[i].status === "PENDING") pending++;
        if (list[i].status === "IN TRANSIT" || list[i].status === "OUT FOR DELIVERY") transit++;
        if (list[i].status === "DELIVERED") delivered++;
      }
      var statsEl = document.getElementById("driver-stats");
      if (statsEl) {
        statsEl.innerHTML =
          '<div class="stat-card"><div class="label">Total Assigned</div><div class="value">' + total + '</div></div>' +
          '<div class="stat-card"><div class="label">Pending</div><div class="value">' + pending + '</div></div>' +
          '<div class="stat-card"><div class="label">In Transit</div><div class="value">' + transit + '</div></div>' +
          '<div class="stat-card"><div class="label">Delivered</div><div class="value">' + delivered + '</div></div>';
      }
      var table = document.getElementById("driver-table");
      if (!table) return;
      if (list.length === 0) {
        table.innerHTML = '<tbody><tr><td colspan="5" style="text-align:center;padding:30px;color:#64748b">No deliveries assigned yet.</td></tr></tbody>';
        return;
      }
      var rows = "";
      for (var j = 0; j < list.length; j++) {
        var d = list[j];
        var badge = d.status === "DELIVERED" ? "delivered" : (d.status === "PENDING" ? "pending" : "transit");
        rows += '<tr>' +
          '<td><strong>' + d.tracking_number + '</strong></td>' +
          '<td>' + (d.delivery_address || "") + '</td>' +
          '<td><span class="badge ' + badge + '">' + d.status + '</span></td>' +
          '<td><button class="btn btn-ghost btn-sm" onclick="driverChangeStatus(' + d.id + ', \'' + d.status + '\')">Update Status</button></td>' +
        '</tr>';
      }
      table.innerHTML = '<thead><tr><th>Tracking</th><th>Destination</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody>';
    });
}
function driverChangeStatus(id, current) {
  var opts = ["PICKED UP","IN TRANSIT","OUT FOR DELIVERY","DELIVERED"];
  var next = prompt("Current: " + current + "\nNew status:\n" + opts.join(", "));
  if (!next) return;
  next = next.toUpperCase().trim();
  if (opts.indexOf(next) === -1) { alert("Pick one of: " + opts.join(", ")); return; }
  var token = localStorage.getItem("swiftship_token");
  fetch("/api/deliveries/" + id + "/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ status: next, note: "Updated by driver" })
  }).then(function(r) {
    if (r.ok) { alert("Updated to " + next); renderDriverDashboard(); }
    else { r.json().then(function(e) { alert("Failed: " + (e.error || "unknown")); }); }
  }).catch(function() { alert("Network error."); });
}
window.renderDriverDashboard = renderDriverDashboard;
window.driverChangeStatus = driverChangeStatus;