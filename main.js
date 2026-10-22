let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let budget = Number(localStorage.getItem("budget")) || 0;

let form = document.getElementById("form");
let rows = document.getElementById("rows");
let today = new Date().toLocaleDateString("en-CA");

document.getElementById("date").value = today;
document.getElementById("budget").value = budget;

function save() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("budget", budget);
}

function month(item) {
    return item.date.slice(0, 7) == today.slice(0, 7);
}

function show() {
    rows.innerHTML = "";

    let filter = document.getElementById("filter").value;
    let sort = document.getElementById("sort").value;

    let shown = expenses.filter(function(item) {
        return filter == "" || item.category == filter;
    });

    if (sort == "new") shown.sort((a, b) => b.date.localeCompare(a.date));
    if (sort == "old") shown.sort((a, b) => a.date.localeCompare(b.date));
    if (sort == "high") shown.sort((a, b) => b.amount - a.amount);
    if (sort == "low") shown.sort((a, b) => a.amount - b.amount);

    shown.forEach(function(item) {
        let tr = document.createElement("tr");

        [item.name, "₹" + item.amount.toFixed(2),
        item.category, item.date].forEach(function(value) {
            let td = document.createElement("td");
            td.textContent = value;
            tr.appendChild(td);
        });

        let td = document.createElement("td");
        let btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.className = "delete";

        btn.onclick = function() {
            expenses = expenses.filter(function(expense) {
                return expense.id != item.id;
            });
            save();
            show();
        };

        td.appendChild(btn);
        tr.appendChild(td);
        rows.appendChild(tr);
    });

    document.getElementById("empty").hidden = shown.length > 0;

    let current = expenses.filter(month);
    let total = current.reduce((sum, item) => sum + item.amount, 0);

    document.getElementById("spent").textContent = "₹" + total.toFixed(2);
    document.getElementById("count").textContent = current.length;
    document.getElementById("left").textContent = "₹" + (budget - total).toFixed(2);
    document.getElementById("warning").textContent =
        budget > 0 && total > budget ? "Budget exceeded!" : "";
}

form.onsubmit = function(event) {
    event.preventDefault();

    let name = document.getElementById("name").value.trim();
    let amount = Number(document.getElementById("amount").value);
    let category = document.getElementById("category").value;
    let date = document.getElementById("date").value;

    if (!name || amount <= 0 || !category || !date) {
        alert("Enter valid expense details.");
        return;
    }

    expenses.push({
        id: Date.now(),
        name: name,
        amount: amount,
        category: category,
        date: date
    });

    save();
    form.reset();
    document.getElementById("date").value = today;
    document.getElementById("message").textContent = "Expense added!";
    show();
};

document.getElementById("budget").onchange = function() {
    budget = Math.max(0, Number(this.value) || 0);
    this.value = budget;
    save();
    show();
};

document.getElementById("filter").onchange = show;
document.getElementById("sort").onchange = show;

document.getElementById("clear").onclick = function() {
    if (confirm("Delete all expenses?")) {
        expenses = [];
        save();
        show();
    }
};

document.getElementById("export").onclick = function() {
    let file = new Blob([JSON.stringify(expenses, null, 2)], {
        type: "application/json"
    });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "expenses.json";
    link.click();
    URL.revokeObjectURL(link.href);
};

document.getElementById("import").onchange = async function() {
    try {
        let data = JSON.parse(await this.files[0].text());

        if (!Array.isArray(data) || !data.every(item =>
            item && typeof item.name == "string" &&
            Number(item.amount) > 0 && item.category &&
            /^\d{4}-\d{2}-\d{2}$/.test(item.date))) {
            throw new Error();
        }

        if (confirm("Replace current expenses with imported expenses?")) {
            expenses = data.map(item => ({
                id: Date.now() + Math.random(),
                name: item.name,
                amount: Number(item.amount),
                category: item.category,
                date: item.date
            }));
            save();
            show();
        }
    } catch {
        alert("Invalid JSON file.");
    }
    this.value = "";
};

document.getElementById("convert").onclick = async function() {
    let result = document.getElementById("result");
    let total = expenses.filter(month)
        .reduce((sum, item) => sum + item.amount, 0);

    result.textContent = "Converting...";

    try {
        let response = await fetch("https://open.er-api.com/v6/latest/INR"); 
        let data = await response.json(); 
        result.textContent = "$" + (total * data.rates.USD).toFixed(2) + " USD"; 
    } catch { 
        result.textContent = "Conversion failed. Check your internet."; 
    } 
}; 
 
show();